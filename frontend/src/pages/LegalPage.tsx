export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 px-6 py-16 sm:py-20 motion-safe:animate-[page-in_350ms_ease-out]">
      <div className="max-w-2xl mx-auto flex flex-col gap-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Fan Content &amp; Privacy</h1>
        </div>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-2">General Disclaimer</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            GachaGrid is an unofficial, fan-made puzzle project created for entertainment purposes. It is not
            affiliated with, endorsed by, or sponsored by any of the games, companies, or trademark holders
            referenced within it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-2">Genshin Impact</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            GachaGrid is not affiliated with,
            endorsed, sponsored, or specifically approved by Cognosphere Pte. Ltd. or HoYoverse. Genshin Impact,
            including its characters, names, and associated assets, is the property of Cognosphere Pte. Ltd. /
            HoYoverse. All rights reserved to their respective owners.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-2">Brawl Stars</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            This material is unofficial and is not endorsed by Supercell. For more information see Supercell's{' '}
            <a
              href="https://www.supercell.com/fan-content-policy"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Fan Content Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-2">Privacy</h2>
          {/* EDIT ME: fill in for real once you confirm what (if anything) is
              being tracked - analytics, accounts, cookies, etc. */}
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            GachaGrid does not currently collect personal data beyond what's necessary to
            serve puzzles and store gameplay stats. This section will be updated if that changes.
          </p>
        </section>
      </div>
    </div>
  );
}
