import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowUpRight } from "lucide-react";
import { DESTINATIONS } from "./navigation";
export default function CommandPalette() {
  const ref = useRef(null),
    previous = useRef(null),
    [query, setQuery] = useState("");
  useEffect(() => {
    const open = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        previous.current = document.activeElement;
        setQuery("");
        if (!ref.current.open) ref.current.showModal();
      }
    };
    window.addEventListener("keydown", open);
    return () => window.removeEventListener("keydown", open);
  }, []);
  function close() {
    ref.current.close();
    previous.current?.focus();
  }
  return (
    <>
      <button
        className="command-launch"
        aria-label="Search all pages"
        onClick={() => {
          previous.current = document.activeElement;
          setQuery("");
          ref.current.showModal();
        }}
      >
        <Search size={16} />
        <span>Find a page</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        className="command-dialog"
        ref={ref}
        aria-label="Search all site locations"
        onClose={() => previous.current?.focus()}
      >
        <div>
          <Search size={19} />
          <input
            autoFocus
            aria-label="Search site locations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where do you want to go?"
          />
          <button aria-label="Close navigation search" onClick={close}>
            <X size={19} />
          </button>
        </div>
        <nav>
          {DESTINATIONS.filter((d) =>
            `${d.label} ${d.description}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          ).map((d) => (
            <a key={d.id} href={`#${d.id}`} onClick={close}>
              <span>
                <strong>{d.label}</strong>
                <small>{d.description}</small>
              </span>
              <ArrowUpRight size={17} />
            </a>
          ))}
          {!DESTINATIONS.some((d) =>
            `${d.label} ${d.description}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          ) && <p>No matching page. Try “cases”, “weather” or “model”.</p>}
        </nav>
      </dialog>
    </>
  );
}
