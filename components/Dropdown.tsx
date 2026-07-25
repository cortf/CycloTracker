"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface Props {
  /** id of the visible <label> that names this control */
  labelId: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

/**
 * Accessible listbox dropdown — a styled replacement for a native <select>.
 * The native popup can't be styled or reliably anchored (its font size and
 * position are OS-controlled); this renders its own popup that stays glued to
 * the button and matches the app's theme. Implements the ARIA listbox pattern:
 * roving highlight via aria-activedescendant, full keyboard support, and
 * click-outside / Escape to close.
 */
export function Dropdown({ labelId, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  const openList = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const commit = (i: number) => {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    close();
  };

  // Move DOM focus into the list when it opens; keep the active option in view.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // Close when clicking outside the control.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <div className="dropdown" ref={wrapRef}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className="dropdown-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${buttonId}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
      >
        <span className="dropdown-value">{selected?.label ?? ""}</span>
        <span className="dropdown-caret" aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          className="dropdown-list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={onListKeyDown}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={optionId(i)}
              role="option"
              aria-selected={i === selectedIndex}
              data-active={i === activeIndex}
              className="dropdown-option"
              onClick={() => commit(i)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
