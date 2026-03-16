import type { AppProps } from "next/app";
import Head from "next/head";
import {
  DM_Sans,
  Figtree,
  IBM_Plex_Mono,
  Inter,
  JetBrains_Mono,
  Manrope,
  Merriweather,
  Outfit,
  Poppins,
  Plus_Jakarta_Sans,
  Public_Sans,
  Rubik,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
import "@/index.css";
import { AppearanceProvider } from "@/context/AppearanceContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});
const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
  weight: ["400", "700"],
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});
const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const fontVariables = [
  inter.variable,
  manrope.variable,
  outfit.variable,
  dmSans.variable,
  plusJakartaSans.variable,
  spaceGrotesk.variable,
  sourceSans.variable,
  merriweather.variable,
  ibmPlexMono.variable,
  jetbrainsMono.variable,
  figtree.variable,
  rubik.variable,
  poppins.variable,
  publicSans.variable,
].join(" ");

export default function TrygcApp({ Component, pageProps }: AppProps) {
  return (
    <AppearanceProvider>
      <div className={`${fontVariables} app-fonts`}>
        <Head>
          <title>Trygc Dashboard</title>
          <meta name="application-name" content="Trygc Dashboard" />
          <meta name="apple-mobile-web-app-title" content="Trygc Dashboard" />
          <meta name="theme-color" content="#111111" />
          <link rel="icon" type="image/png" href="/trygc-favicon.png" />
          <link rel="apple-touch-icon" href="/trygc-favicon.png" />
        </Head>
        <Component {...pageProps} />
      </div>
    </AppearanceProvider>
  );
}
