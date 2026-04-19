import { EncryptedText } from "@/components/ui/encrypted-text";

export function Home() {
  return (
    <>
      <div className="flex flex-col justify-between h-full">
        <span>
          <h1>
            Hi, I'm{" "}
            <EncryptedText revealDelayMs={200} flipDelayMs={1} text="Zenko" />!
          </h1>
          <h2>
            <EncryptedText
              text="Welcome to my personal project showcase! In the future the main page and other stuff may change in a private fork as these are not final, but the rest of the source code will be available. Go ahead and try out all the features!
              The core part of the software will be open source, only the portfolio part for myself in the future will be closed source."
              revealDelayMs={10}
            />
          </h2>
        </span>
      </div>
    </>
  );
}
