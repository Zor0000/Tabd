"use client";

import { useRef, type PointerEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import styles from "./landing-page.module.css";

export function LandingHeadline() {
  const heading = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(50);
  const y = useMotionValue(50);
  const lightX = useSpring(x, { stiffness: 160, damping: 26 });
  const lightY = useSpring(y, { stiffness: 160, damping: 26 });
  const mask = useMotionTemplate`radial-gradient(ellipse 160px 100px at ${lightX}% ${lightY}%, #000 0%, transparent 100%)`;

  function move(event: PointerEvent<HTMLHeadingElement>) {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const bounds = heading.current?.getBoundingClientRect();
    if (!bounds) return;
    x.set(((event.clientX - bounds.left) / bounds.width) * 100);
    y.set(((event.clientY - bounds.top) / bounds.height) * 100);
  }

  return (
    <h1 id="landing-title" ref={heading} onPointerMove={move}>
      Save the sites you love.
      <br />
      Find them when it matters.
      <motion.span
        className={styles.headlineReflection}
        aria-hidden="true"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        Save the sites you love.
        <br />
        Find them when it matters.
      </motion.span>
    </h1>
  );
}
