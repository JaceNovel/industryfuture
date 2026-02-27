import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";

function FacebookLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06C2 17.08 5.657 21.24 10.438 22v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.196 2.238.196v2.475h-1.261c-1.243 0-1.631.78-1.631 1.58v1.88h2.773l-.443 2.91h-2.33V22C18.343 21.24 22 17.08 22 12.06z" />
    </svg>
  );
}

function InstagramLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4z" />
      <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M17.25 6.75a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
    </svg>
  );
}

function TikTokLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 3v10.06a3.94 3.94 0 1 1-3-3.82V7.06A6 6 0 1 0 16 12V7.2c1.08 1.02 2.52 1.65 4 1.72V6.5c-2.21-.19-3.78-1.43-4.62-3.5H14z" />
    </svg>
  );
}

export function SiteFaq() {
  return (
    <footer
      id="site-footer"
      className="rounded-t-3xl bg-primary text-primary-foreground shadow-[0_-14px_40px_-28px_rgba(12,28,66,0.7)]"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex flex-col gap-10 py-10 text-left md:grid md:grid-cols-4 md:justify-between md:py-14 md:text-left">
          {/* Brand */}
          <div className="w-full space-y-4 md:w-auto">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-start">
              <div className="footer-logo-shell relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-15px_rgba(12,28,66,0.45)]">
                <div className="relative h-10 w-10">
                  <Image
                    src="/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png"
                    alt={"Industrie de l'avenir"}
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="text-xl font-semibold">{"Industrie de l'avenir"}</div>
            </div>
            <div className="text-sm text-primary-foreground/80">Votre boutique en ligne de confiance</div>
          </div>

          {/* Navigation */}
          <div className="w-full space-y-4 md:min-w-[180px] md:flex-none md:text-left">
            <div className="text-base font-semibold">Navigation</div>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="/shop" className="text-primary-foreground hover:text-accent hover:underline">
                Produits
              </Link>
              <Link href="/promotions" className="text-primary-foreground hover:text-accent hover:underline">
                Promotions
              </Link>
              <Link href="#" className="text-primary-foreground hover:text-accent hover:underline">
                Offres groupées
              </Link>
              <Link href="/cart" className="text-primary-foreground hover:text-accent hover:underline">
                Panier
              </Link>
            </div>
          </div>

          {/* Service client */}
          <div className="w-full space-y-4 md:min-w-[180px] md:flex-none md:text-left">
            <div className="text-base font-semibold">Service client</div>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="#" className="text-primary-foreground hover:text-accent hover:underline">
                Assistance importation
              </Link>
              <Link href="/tracking" className="text-primary-foreground hover:text-accent hover:underline">
                Suivi de commande
              </Link>
              <Link href="#" className="text-primary-foreground hover:text-accent hover:underline">
                Contact
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="w-full space-y-4 md:min-w-[200px] md:flex-none md:text-left">
            <div className="text-base font-semibold">Contact</div>
            <div className="space-y-3 text-sm text-primary-foreground/80">
              <div className="flex items-center justify-start gap-3">
                <Phone className="h-4 w-4" />
                <span>+22879987000</span>
              </div>
              <div className="flex items-center justify-start gap-3">
                <Mail className="h-4 w-4" />
                <span>support@futurind.space</span>
              </div>
              <div className="flex items-center justify-start gap-3">
                <MapPin className="h-4 w-4" />
                <span>Lomé, Togo</span>
              </div>
            </div>

            <div className="flex items-center justify-start gap-3 pt-2">
              <a
                href="https://www.facebook.com/profile.php?id=61578635757172"
                aria-label="Facebook"
                className="inline-flex items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 p-2 text-primary-foreground hover:bg-accent/20"
                target="_blank"
                rel="noreferrer"
              >
                <FacebookLogo className="h-4 w-4" />
              </a>
              <a
                href="https://www.tiktok.com/@a_d_a_n.gladiator?_r=1&_t=ZS-941CIvuHTwv"
                aria-label="TikTok"
                className="inline-flex items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 p-2 text-primary-foreground hover:bg-accent/20"
                target="_blank"
                rel="noreferrer"
              >
                <TikTokLogo className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/meslmenehasn?utm_source=qr&igsh=YjJ5aTRid3Zkangy"
                aria-label="Instagram"
                className="inline-flex items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 p-2 text-primary-foreground hover:bg-accent/20"
                target="_blank"
                rel="noreferrer"
              >
                <InstagramLogo className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 py-6 md:py-8">
          <div className="text-sm text-primary-foreground/75">© 2025 {"Industrie de l'avenir"}. Tous droits réservés.</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-4">
              <Image src="/payments/paypal.svg" alt="PayPal" width={72} height={20} />
            </span>
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-4">
              <Image src="/payments/mastercard.svg" alt="Mastercard" width={88} height={20} />
            </span>
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-4">
              <Image src="/payments/visa.svg" alt="VISA" width={54} height={20} />
            </span>
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-4">
              <Image src="/payments/tmoney.svg" alt="TMoney" width={62} height={20} />
            </span>
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-4">
              <Image src="/payments/flooz.svg" alt="Flooz" width={56} height={20} />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
