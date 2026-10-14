"use client";

import { useRef, type PointerEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import Link from "next/link";

// Geometric lettering keeps the engraved mark sharp at every display size.
const lettering =
  "M30 25H100V105H185V170H100V255Q100 290 140 290H185V355H137Q30 355 30 260V170H0V105H30Z M335 105C250 105 205 158 205 230S250 355 335 355H455V230C455 158 410 105 335 105Z M335 170C371 170 390 195 390 230S371 290 335 290S270 265 270 230S299 170 335 170Z M480 0H545V120Q570 105 605 105C680 105 730 158 730 230S680 355 605 355H480Z M605 170C569 170 545 195 545 230S569 290 605 290S665 265 665 230S641 170 605 170Z M935 0H1000V355H875C800 355 750 302 750 230S800 105 875 105Q910 105 935 120Z M875 170C839 170 815 195 815 230S839 290 875 290S935 265 935 230S911 170 875 170Z";

export function AuthWordmark({ showChrome = true }: { showChrome?: boolean }) {
  const panel = useRef<HTMLElement>(null);
  const mark = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(50);
  const y = useMotionValue(50);
  const springX = useSpring(x, { stiffness: 160, damping: 26 });
  const springY = useSpring(y, { stiffness: 160, damping: 26 });
  const reflectionX = useMotionValue(500);
  const reflectionY = useMotionValue(180);
  const lightX = useSpring(reflectionX, { stiffness: 160, damping: 26 });
  const lightY = useSpring(reflectionY, { stiffness: 160, damping: 26 });
  const reflectionTransform = useMotionTemplate`translate(${lightX} ${lightY})`;
  const mask = useMotionTemplate`radial-gradient(ellipse 310px 310px at ${springX}% ${springY}%, #000 0%, #000 30%, transparent 100%)`;
  function move(event: PointerEvent<HTMLElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const bounds = panel.current?.getBoundingClientRect();
    if (!bounds) return;
    x.set(((event.clientX - bounds.left) / bounds.width) * 100);
    y.set(((event.clientY - bounds.top) / bounds.height) * 100);
    const matrix = mark.current?.getScreenCTM();
    if (matrix) {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      reflectionX.set(point.x);
      reflectionY.set(point.y);
    }
  }
  return (
    <section
      ref={panel}
      className="auth-sculpture"
      onPointerMove={move}
      aria-label="Tabd, your personal web library"
    >
      <div className="auth-metal-grain" aria-hidden="true" />
      {showChrome && (
        <nav className="auth-art-nav" aria-label="Library preview">
          <Link href="/preview">
            Explore the library <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      )}
      <div className="auth-engraving" aria-hidden="true">
        <svg
          ref={mark}
          viewBox="-15 -15 1030 390"
          className="auth-engraved-mark"
        >
          <defs>
            <filter
              id="engraved"
              x="-10%"
              y="-15%"
              width="120%"
              height="135%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset in="blur" dx="0" dy="4" result="offset" />
              <feComposite
                in="offset"
                in2="SourceAlpha"
                operator="out"
                result="rim"
              />
              <feFlood floodColor="#fff" floodOpacity=".9" />
              <feComposite in2="rim" operator="in" result="light" />
              <feOffset in="SourceAlpha" dx="0" dy="6" result="shifted" />
              <feComposite in="SourceAlpha" in2="shifted" operator="out" />
              <feGaussianBlur stdDeviation="5" />
              <feComposite in2="SourceAlpha" operator="in" result="shadow" />
              <feFlood floodColor="#4c535a" floodOpacity=".8" />
              <feComposite in2="shadow" operator="in" result="inner" />
              <feMerge>
                <feMergeNode in="light" />
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="inner" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={lettering}
            fillRule="evenodd"
            fill="#b9bcc0"
            filter="url(#engraved)"
          />
          <path
            d={lettering}
            fillRule="evenodd"
            fill="none"
            stroke="#94999f"
            strokeOpacity=".35"
            strokeWidth="1"
          />
        </svg>
      </div>
      <motion.div
        className="auth-light-reveal"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        aria-hidden="true"
      >
        <div className="auth-engraving">
          <svg viewBox="-15 -15 1030 390">
            <defs>
              {/* Offset the white source above the pointer so its lower fringe
                  catches cyan and blue, like light reflected in brushed metal. */}
              <motion.radialGradient
                id="metal-reflection"
                gradientUnits="userSpaceOnUse"
                cx="0"
                cy="-95"
                r="300"
                gradientTransform={reflectionTransform}
              >
                <stop offset="0" stopColor="#ffffff" />
                <stop offset=".4" stopColor="#f9fdff" />
                <stop offset=".57" stopColor="#e0faff" />
                <stop offset=".7" stopColor="#a6eaff" />
                <stop offset=".82" stopColor="#94bfff" stopOpacity=".8" />
                <stop offset="1" stopColor="#b9bcc0" stopOpacity="0" />
              </motion.radialGradient>
              <filter
                id="reflection-rim"
                x="-10%"
                y="-20%"
                width="120%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            <path
              d={lettering}
              fillRule="evenodd"
              fill="none"
              stroke="url(#metal-reflection)"
              strokeWidth="8"
              filter="url(#reflection-rim)"
            />
            <path
              d={lettering}
              fillRule="evenodd"
              fill="url(#metal-reflection)"
              stroke="url(#metal-reflection)"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </motion.div>
      {showChrome && (
        <footer className="auth-art-footer">
          <span>Your useful corner of the internet.</span>
          <span>© TABD {new Date().getFullYear()}</span>
        </footer>
      )}
    </section>
  );
}
