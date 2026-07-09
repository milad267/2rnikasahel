"use client";

import { useEffect } from "react";

export function HeightSync() {
  useEffect(() => {
    const updateHeights = () => {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      if (header) document.documentElement.style.setProperty("--header-height", `${header.offsetHeight}px`);
      if (footer) document.documentElement.style.setProperty("--footer-height", `${footer.offsetHeight}px`);
    };

    updateHeights();
    window.addEventListener("resize", updateHeights);

    const observer = new ResizeObserver(updateHeights);
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    if (header) observer.observe(header);
    if (footer) observer.observe(footer);

    return () => {
      window.removeEventListener("resize", updateHeights);
      observer.disconnect();
    };
  }, []);

  return null;
}
