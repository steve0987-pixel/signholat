import React, { useMemo, useState } from "react";
import { CATEGORIES } from "../constants/options";

export default function SubmitPage({ onSubmit }) {
  const [form, setForm] = useState({
    category: CATEGORIES[0],
    description: "",
    location: "",
    placeName: "",
    imageFile: null,
    imagePreview: ""
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(form.category && form.description.trim() && form.location.trim() && form.placeName.trim() && form.imagePreview);
  }, [form]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateField("imageFile", file);
    updateField("imagePreview", preview);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported. Please enter address manually.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateField("location", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => {
        setError("Unable to get current location. Please enter address manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetForm = () => {
    setForm({
      category: CATEGORIES[0],
      description: "",
      location: "",
      placeName: "",
      imageFile: null,
      imagePreview: ""
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setError("");

    if (!canSubmit) {
      setError("Please complete category, photo, description, location, and place name.");
      return;
    }

    onSubmit({
      category: form.category,
      description: form.description.trim(),
      location: form.location.trim(),
      placeName: form.placeName.trim(),
      image: form.imagePreview
    });

    resetForm();
    setSuccessMessage("Report submitted. It is now visible in the public dashboard.");
  };

  return (
    <section className="tab-page">
      <header className="page-header">
        <h1>Submission Report</h1>
        <p>Report infrastructure issues in a few quick steps.</p>
      </header>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <label>
          Category
          <select value={form.category} onChange={(e) => updateField("category", e.target.value)}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Photo
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
        </label>

        {form.imagePreview ? (
          <img className="upload-preview" src={form.imagePreview} alt="Upload preview" />
        ) : null}

        <label>
          Description
          <textarea
            placeholder="Describe what is wrong and why it matters"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
          />
        </label>

        <label>
          Object / Place Name
          <input
            type="text"
            placeholder="School No. 12 - Toilet Block A"
            value={form.placeName}
            onChange={(e) => updateField("placeName", e.target.value)}
          />
        </label>

        <label>
          Location
          <input
            type="text"
            placeholder="Use current geolocation or enter address"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
          />
        </label>

        <button className="secondary-btn" type="button" onClick={handleGetLocation} disabled={locating}>
          {locating ? "Getting location..." : "Use current geolocation"}
        </button>

        <button className="primary-btn" type="submit">
          Submit Report
        </button>

        {error ? <p className="error-text">{error}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}
      </form>
    </section>
  );
}
