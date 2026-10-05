export interface AudioPreset {
  bpm: number;
  root: number; // midi note
  scale: number[]; // semitone offsets
  seed: number;
  arpProb: number; // probability of an arp note per 8th
  arpWave: OscillatorType;
  padWave: OscillatorType;
  kick: boolean;
  brightness: number; // lowpass cutoff hz
  humanize: number; // timing wobble
}

export interface Track {
  id: string;
  titleFa: string;
  titleEn: string;
  genre: string;
  mood: string;
  duration: string;
  previewSec: number;
  plays: string;
  release: string;
  cover: string;
  /**
   * Optional local audio file. Put your file in `public/audio/` and reference
   * it like `/audio/shabtab.mp3`. If the file is missing, the player
   * automatically falls back to the generative preview.
   */
  src?: string;
  audio: AudioPreset;
}

export const tracks: Track[] = [
  {
    id: "shabtab",
    titleFa: "شب‌تاب",
    titleEn: "SHABTAB",
    genre: "ملودیک تکنو",
    mood: "شبانه / درخشان",
    duration: "4:12",
    previewSec: 34,
    plays: "248K",
    release: "دی ۱۴۰۴",
    cover: "/images/cover-shabtab.jpg",
    src: "/audio/shabtab.mp3",
    audio: {
      bpm: 121,
      root: 45,
      scale: [0, 3, 5, 7, 10],
      seed: 11,
      arpProb: 0.52,
      arpWave: "sawtooth",
      padWave: "sawtooth",
      kick: true,
      brightness: 900,
      humanize: 0.004,
    },
  },
  {
    id: "mohtab",
    titleFa: "مهتاب",
    titleEn: "MOHTAB",
    genre: "امبینت",
    mood: "آرام / ماهی",
    duration: "3:57",
    previewSec: 34,
    plays: "189K",
    release: "آذر ۱۴۰۴",
    cover: "/images/cover-mohtab.jpg",
    src: "/audio/mohtab.mp3",
    audio: {
      bpm: 72,
      root: 50,
      scale: [0, 3, 5, 7, 10],
      seed: 23,
      arpProb: 0.3,
      arpWave: "triangle",
      padWave: "sine",
      kick: false,
      brightness: 1600,
      humanize: 0.02,
    },
  },
  {
    id: "bigharar",
    titleFa: "بی‌قرار",
    titleEn: "BIGHARAR",
    genre: "تریپ‌هاپ",
    mood: "مضطرب / تاریک",
    duration: "3:24",
    previewSec: 34,
    plays: "402K",
    release: "آبان ۱۴۰۴",
    cover: "/images/cover-bigharar.jpg",
    src: "/audio/bigharar.mp3",
    audio: {
      bpm: 86,
      root: 43,
      scale: [0, 2, 3, 7, 8],
      seed: 37,
      arpProb: 0.46,
      arpWave: "triangle",
      padWave: "sawtooth",
      kick: true,
      brightness: 1100,
      humanize: 0.014,
    },
  },
  {
    id: "shahr",
    titleFa: "شهر خاموش",
    titleEn: "SHAHR-E KHAMOOSH",
    genre: "داون‌تمپو",
    mood: "مه‌آلود / خالی",
    duration: "5:06",
    previewSec: 34,
    plays: "156K",
    release: "مهر ۱۴۰۴",
    cover: "/images/cover-shahr.jpg",
    src: "/audio/shahr.mp3",
    audio: {
      bpm: 66,
      root: 41,
      scale: [0, 3, 5, 6, 10],
      seed: 53,
      arpProb: 0.26,
      arpWave: "sine",
      padWave: "sine",
      kick: false,
      brightness: 700,
      humanize: 0.024,
    },
  },
  {
    id: "ragbar",
    titleFa: "رگبار",
    titleEn: "RAGBAR",
    genre: "ملودیک هاوس",
    mood: "بارانی / امیدوار",
    duration: "4:38",
    previewSec: 34,
    plays: "97K",
    release: "شهریور ۱۴۰۴",
    cover: "/images/cover-ragbar.jpg",
    src: "/audio/ragbar.mp3",
    audio: {
      bpm: 118,
      root: 47,
      scale: [0, 2, 4, 7, 9],
      seed: 71,
      arpProb: 0.56,
      arpWave: "triangle",
      padWave: "triangle",
      kick: true,
      brightness: 2000,
      humanize: 0.006,
    },
  },
];

export type Brand =
  | "spotify"
  | "soundcloud"
  | "telegram"
  | "instagram"
  | "youtube"
  | "apple";

export interface PlatformLink {
  id: Brand;
  name: string;
  handle: string;
  desc: string;
  followers: string;
  url: string;
  color: string; // brand accent
  featured?: boolean;
}

export const links: PlatformLink[] = [
  {
    id: "spotify",
    name: "Spotify",
    handle: "اسپاتیفای",
    desc: "همه‌ی ترک‌ها و پلی‌لیست‌های رسمی",
    followers: "128K",
    url: "https://open.spotify.com",
    color: "#1DB954",
    featured: true,
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    handle: "ساندکلاد",
    desc: "ریمیکس‌ها، دموها و نسخه‌های منتشرنشده",
    followers: "64K",
    url: "https://soundcloud.com",
    color: "#FF5500",
    featured: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    handle: "تلگرام",
    desc: "کانال رسمی؛ انتشار زودهنگام ترک‌های جدید",
    followers: "89K",
    url: "https://t.me",
    color: "#229ED9",
  },
  {
    id: "instagram",
    name: "Instagram",
    handle: "اینستاگرام",
    desc: "پشت صحنه، اجراها و زندگی روزمره",
    followers: "210K",
    url: "https://instagram.com",
    color: "#E1306C",
  },
  {
    id: "youtube",
    name: "YouTube",
    handle: "یوتیوب",
    desc: "موزیک‌ویدیوها و ست‌های زنده",
    followers: "95K",
    url: "https://youtube.com",
    color: "#FF0000",
  },
  {
    id: "apple",
    name: "Apple Music",
    handle: "اپل میوزیک",
    desc: "گوش دادن با کیفیت Lossless",
    followers: "41K",
    url: "https://music.apple.com",
    color: "#FA243C",
  },
];

export const genres = [
  "الکترونیک",
  "امبینت",
  "تریپ‌هاپ",
  "ملودیک تکنو",
  "داون‌تمپو",
  "پرشین الکترونیک",
  "NAVA",
  "تهران",
];
