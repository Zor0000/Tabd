import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, EllipsisVertical, Puzzle, RotateCw, SlidersHorizontal } from "lucide-react";
import { AuthWordmark } from "@/components/auth-wordmark";
import { LandingHeadline } from "@/components/landing-headline";
import styles from "./landing-page.module.css";

export function LandingPage() {
  return (
    <main className={styles.landing}>
      <a className={styles.skip} href="#benefits">
        Skip to the introduction
      </a>
      <section className={styles.hero} aria-labelledby="landing-title">
        <div className={styles.art}>
          <AuthWordmark showChrome={false} />
        </div>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Tabd home">
            tabd<span>.</span>
          </Link>
          <nav aria-label="Main navigation">
            <a href="#benefits">Discover Tabd</a>
            <a href="#extension">Extension</a>
            <Link href="/login">
              Sign in <ArrowUpRight size={15} />
            </Link>
          </nav>
        </header>
        <div className={styles.heroCopy}>
          <LandingHeadline />
        </div>
        <a className={styles.scroll} href="#benefits">
          A little less tab chaos <ArrowDown size={17} />
        </a>
      </section>

      <section
        className={styles.intro}
        id="benefits"
        aria-labelledby="benefits-title"
      >
        <h2 id="benefits-title">
          Good finds deserve
          <br />
          more than an open tab.
        </h2>
        <div>
          <p>
            The tool for your next project. The article you want to finish. That
            bit of design inspiration. Give your useful corner of the internet a
            place of its own.
          </p>
          <a className={styles.textLink} href="#extension">
            Save it with the extension <ArrowDown size={17} />
          </a>
        </div>
        <figure className={styles.tabClutter}>
          <Image
            src="/landing/tab-clutter.svg"
            alt="Illustration of overlapping browser windows crowded with open tabs, with titles squeezed down to just a few letters."
            width={1200}
            height={340}
            sizes="(max-width: 600px) 88vw, 86vw"
          />
        </figure>
      </section>

      <section
        className={styles.extension}
        id="extension"
        aria-labelledby="extension-title"
      >
        <div className={styles.extensionCopy}>
          <h2 id="extension-title">
            Keep the find.
            <br />
            Close the tab.
          </h2>
          <p>
            Save the page you’re on with the Tabd Chrome extension. Your next
            good find goes straight to your library, without breaking your flow.
          </p>
          <ol className={styles.saveSteps}>
            <li>
              <strong>Open Tabd in your toolbar</strong>
              <span>The current page is already filled in.</span>
            </li>
            <li>
              <strong>Pick a place, or organize later</strong>
              <span>Choose a collection or keep it in your Inbox.</span>
            </li>
            <li>
              <strong>Save it for when you need it</strong>
              <span>Add tags and a note if you have more to remember.</span>
            </li>
          </ol>
          <a className={styles.textLink} href="#library">
            See where your saves land <ArrowDown size={17} />
          </a>
        </div>
        <figure className={styles.extensionPreview}>
          <div className={styles.browserFrame}>
            <div className={styles.browserTab} aria-hidden="true">
              <span /><span /><span />
              <div>A small collection of useful things</div>
            </div>
            <div className={styles.browserToolbar} aria-hidden="true">
              <ArrowLeft size={15} />
              <RotateCw size={14} />
              <div className={styles.browserAddress}>
                <SlidersHorizontal size={13} /> example.com/design
              </div>
              <span className={styles.toolbarTabd}>tabd<span>.</span></span>
              <Puzzle size={17} />
              <EllipsisVertical size={16} />
            </div>
            <div className={styles.browserCanvas}>
              <div className={styles.exampleArticle} aria-hidden="true">
                <span>Design & everyday discoveries</span>
                <p>A small collection of useful things.</p>
                <div /><div /><div />
              </div>
              <Image
                className={styles.extensionPopup}
                src="/landing/extension-save.png"
                alt="The Tabd Chrome extension with the current page filled in, a Save to collection selector set to Inbox, optional Add details, and the orange Save page button."
                width={720}
                height={920}
                sizes="(max-width: 600px) 76vw, 320px"
              />
            </div>
          </div>
          <figcaption>Tabd Chrome extension · Example save, actual interface</figcaption>
        </figure>
      </section>

      <section
        className={styles.library}
        id="library"
        aria-labelledby="library-title"
      >
        <div className={styles.sectionHeading}>
          <h2 id="library-title">
            Less searching.
            <br />
            More doing.
          </h2>
          <p>
            Recognize a site at a glance. Keep your favorites close. Pick up
            where your curiosity left off.
          </p>
        </div>
        <figure className={styles.fullScreenshot}>
          <Image
            src="/landing/library.png"
            alt="Tabd preview dashboard showing saved websites with visual previews, favorites, tags, and collections."
            width={1440}
            height={1000}
            sizes="(max-width: 760px) 94vw, 86vw"
          />
          <figcaption>A look inside Tabd · Example preview library</figcaption>
        </figure>
      </section>

      <section className={styles.organize} aria-labelledby="organize-title">
        <div className={styles.organizeCopy}>
          <h2 id="organize-title">
            Your finds.
            <br />
            Your kind of order.
          </h2>
          <p>
            Bring related links together in collections. Add tags for the
            details. Keep what you’re exploring separate from what you use every
            day.
          </p>
          <ul>
            <li>
              <span>Collections</span>
              <span>A place for every project and interest.</span>
            </li>
            <li>
              <span>Tags & search</span>
              <span>Find the link, even if you forget its name.</span>
            </li>
            <li>
              <span>Resource status</span>
              <span>To explore, in use, or kept for reference.</span>
            </li>
          </ul>
        </div>
        <figure className={styles.detailScreenshot}>
          <Image
            src="/landing/collection.png"
            alt="The Design inspiration collection in the Tabd preview, with Linear, Mobbin, and Godly saved together."
            width={1440}
            height={1000}
            sizes="(max-width: 900px) 94vw, 62vw"
          />
          <figcaption>Design inspiration · An example collection</figcaption>
        </figure>
      </section>

      <section className={styles.cta} aria-labelledby="preview-title">
        <h2 id="preview-title">
          Make room for
          <br />
          your next good find.
        </h2>
        <p>Take a look around a library that’s already filled with a few.</p>
        <Link className={styles.primary} href="/preview">
          Explore the dashboard <ArrowRight size={19} />
        </Link>
        <span className={styles.note}>
          No account needed. Just a little curiosity.
        </span>
      </section>
      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}>
          tabd<span>.</span>
        </Link>
        <span>Your useful corner of the internet.</span>
        <Link href="/login">
          Make yourself at home <ArrowUpRight size={15} />
        </Link>
      </footer>
    </main>
  );
}
