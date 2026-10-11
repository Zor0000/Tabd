import {
  ArrowUpRight,
  Command,
  Triangle,
  Zap,
  Code2,
  Layers,
} from "lucide-react";
export function PreviewArt({ kind }: { kind: string }) {
  return (
    <div className={`preview-art art-${kind}`} aria-hidden="true">
      {kind === "shadcn" ? (
        <>
          <span className="mini-brand">shadcn/ui</span>
          <div className="shadcn-heading">
            Build your
            <br />
            component library.
          </div>
          <div className="mini-components">
            <span>
              Get started <ArrowUpRight size={10} />
            </span>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="mini-window">
            <span>Appearance</span>
            <div />
            <div />
            <div />
          </div>
        </>
      ) : null}
      {kind === "linear" ? (
        <>
          <span className="mini-brand">
            <span className="linear-mark" /> Linear
          </span>
          <div className="linear-heading">
            Built for the way
            <br />
            you build.
          </div>
          <div className="linear-board">
            <span>Product / Projects</span>
            <div />
            <div />
            <div />
          </div>
        </>
      ) : null}
      {kind === "reactbits" ? (
        <>
          <span className="mini-brand">
            React Bits <span>✳</span>
          </span>
          <div className="bits-heading">
            React components.
            <br />
            <em>Anything but boring.</em>
          </div>
          <div className="bits-dots">
            ● <span>●</span> ● <span>●</span>
          </div>
        </>
      ) : null}
      {kind === "vercel" ? (
        <>
          <span className="mini-brand">
            <Triangle size={13} fill="currentColor" /> Vercel
          </span>
          <div className="vercel-heading">
            Your vision.
            <br />
            <span>Our infrastructure.</span>
          </div>
          <div className="vercel-triangle">
            <Triangle size={78} strokeWidth={0.6} />
          </div>
        </>
      ) : null}
      {kind === "mobbin" ? (
        <>
          <span className="mini-brand">
            Mobbin <Layers size={13} />
          </span>
          <div className="mobbin-heading">
            Discover.
            <br />
            Get inspired.
          </div>
          <div className="phone phone-one">
            <i />
            <b>
              Make room
              <br />
              for good things.
            </b>
            <span />
          </div>
          <div className="phone phone-two">
            <i />
            <b>
              Your daily
              <br />
              dose of calm.
            </b>
            <span />
          </div>
        </>
      ) : null}
      {kind === "supabase" ? (
        <>
          <span className="mini-brand">
            <Zap size={14} fill="currentColor" /> supabase
          </span>
          <div className="supabase-heading">
            Build in a weekend.
            <br />
            <span>Scale to millions.</span>
          </div>
          <div className="mini-code">
            <span>const</span> ideas = <span>await</span> build();
          </div>
        </>
      ) : null}
      {kind === "cursor" ? (
        <>
          <span className="mini-brand">
            <Command size={13} /> Cursor
          </span>
          <div className="cursor-heading">Stay in flow.</div>
          <div className="cursor-code">
            <span>function</span> createSomething() {"{"}
            <br />
            &nbsp; return <em>yourNextIdea</em>;<br />
            {"}"}
          </div>
        </>
      ) : null}
      {kind === "typescript" ? (
        <>
          <span className="mini-brand">
            <Code2 size={14} /> TypeScript
          </span>
          <div className="typescript-heading">
            JavaScript.
            <br />
            With syntax for types.
          </div>
          <strong className="ts-mark">TS</strong>
        </>
      ) : null}
      {kind === "godly" ? (
        <>
          <span className="mini-brand">godly.</span>
          <div className="godly-heading">
            A little out
            <br />
            of the ordinary.
          </div>
          <div className="godly-shape" />
        </>
      ) : null}
    </div>
  );
}
