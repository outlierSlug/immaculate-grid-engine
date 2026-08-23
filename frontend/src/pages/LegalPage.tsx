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
            GachaGrid is an unofficial, fan-made project created for entertainment purposes. It is not
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

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Privacy</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            GachaGrid does not sell or share your data with third parties for advertising or use analytics
            tracking scripts.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            <b>Anonymous Play</b>. If you play anonymously (without signing in), GachaGrid generates a random ID in your browser to save
            gameplay and calculate aggregate puzzle stats. No personal details are ever tracked.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            <b>Google Sign-In</b>. Signing in is entirely optional, but if you do choose to sign in, Google shares your email address, display
            name, profile picture, and Google ID with us, which we use to manage your account. We never see or store your Google
            password.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            <b>Account Deletion.</b> You have the right to permanently delete your account anytime from your
            Profile page. Your profile data will be wiped immediately, and your past gameplay stats will be
            permanently anonymized.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Policy updates will be posted here. Questions? Email us at{' '}
            <a
              href="mailto:gachagrid.dev@gmail.com"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              gachagrid.dev@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
