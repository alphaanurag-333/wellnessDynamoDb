import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { mediaUrl } from "../../media.js";

function messageParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function LeadershipMessageSection({
  badge = "A NOTE FROM LEADERSHIP",
  title,
  name,
  designation,
  message,
  profileImage = "",
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const paragraphs = messageParagraphs(message);
  const imageSrc = profileImage ? mediaUrl(profileImage) : "";
  const showImage = Boolean(imageSrc) && !imageError;

  useEffect(() => {
    setImageError(false);
  }, [imageSrc]);

  if (!name || paragraphs.length === 0) {
    return null;
  }

  return (
    <section className={`leadership${className ? ` ${className}` : ""}`}>
      <div className="site-container">
        <div className={`leadership__card${showImage ? "" : " leadership__card--no-image"}`}>
          {showImage ? (
            <div className="leadership__image">
              <div className="leadership__image-frame">
                <img src={imageSrc} alt={name} onError={() => setImageError(true)} />
              </div>
            </div>
          ) : null}

          <div className="leadership__content">
            <span className="leadership__badge">{badge}</span>
            <h2 className="leadership__title">{title}</h2>

            <div className="leadership__author">
              <h4>{name}</h4>
              {designation ? <span>{designation}</span> : null}
            </div>

            <div className={`leadership__description${expanded ? " expanded" : ""}`}>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <button type="button" className="leadership__link" onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? "Read Less" : "Read More"}
              {expanded ? <ArrowUpRight size={18} /> : <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
