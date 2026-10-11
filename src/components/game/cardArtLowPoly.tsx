import type { DevCardType, ProgressCardType, Track } from '@/engine/types';

/**
 * Low-poly card illustrations for the "Emblem x Low-poly" card design: flat facets lit from the top
 * left with one ink outline per piece, drawn in a 100 x 100 box. Each fragment goes inside the
 * `CardTile` hex (translate(16 15) scale(0.68)). Coordinates and colours are the approved design's.
 */

const INK = '#131a1d';
const PAPER = '#fbfcfc';

export const DEV_ART: Record<DevCardType, React.ReactNode> = {
  knight: (
    <>
      <polygon points="14,98 20,86 34,82 50,84 50,98" fill="#868c96"/><polygon points="50,84 66,82 80,86 86,98 50,98" fill="#5f646d"/><path d="M14 98L20 86L34 82L66 82L80 86L86 98Z" fill="none" stroke="#131a1d"/>
      <polygon points="50,22 47,10 56,4 60,13" fill="#e8664c"/><polygon points="50,22 60,13 68,12 62,20" fill="#c94a33"/><path d="M50 22L47 10L56 4L60 13L68 12L62 20Z" fill="none" stroke="#131a1d"/>
      <polygon points="50,21 36,30 30,46 50,46" fill="#eef1f4"/><polygon points="50,21 64,30 70,46 50,46" fill="#b3b8c1"/><polygon points="30,46 50,46 50,86 30,86" fill="#c9ced6"/><polygon points="50,46 70,46 70,86 50,86" fill="#868c96"/>
      <polygon points="30,44 70,44 70,51 30,51" fill="#131a1d"/><polygon points="47.5,51 52.5,51 52.5,86 47.5,86" fill="#131a1d"/>
      <g fill="#131a1d"><circle cx="39" cy="61" r="2.6"/><circle cx="39" cy="69" r="2.6"/><circle cx="61" cy="61" r="2.6"/><circle cx="61" cy="69" r="2.6"/></g>
      <polygon points="30,86 30,46 36,30 50,21 64,30 70,46 70,86" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
    </>
  ),
  victoryPoint: (
    <>
      <path d="M44 92L30 86L21 72L18 56L21 42L27 31M56 92L70 86L79 72L82 56L79 42L73 31" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="42.6,90.4 37,85.2 29.4,85.6" fill="#b4dc80"/><polygon points="42.6,90.4 29.4,85.6 35,90.8" fill="#5e8c46"/>
      <polygon points="31,85 28.1,77.9 21,75" fill="#b4dc80"/><polygon points="31,85 21,75 23.9,82.1" fill="#5e8c46"/>
      <polygon points="22.4,74.6 22.8,67 17.6,61.4" fill="#b4dc80"/><polygon points="22.4,74.6 17.6,61.4 17.2,69" fill="#5e8c46"/>
      <polygon points="18,62 21,55 18,48" fill="#b4dc80"/><polygon points="18,62 18,48 15,55" fill="#5e8c46"/>
      <polygon points="17.6,48.6 22.8,43 22.4,35.4" fill="#b4dc80"/><polygon points="17.6,48.6 22.4,35.4 17.2,41" fill="#5e8c46"/>
      <polygon points="22,36.7 28.5,32.7 30,25.3" fill="#b4dc80"/><polygon points="22,36.7 30,25.3 23.5,29.3" fill="#5e8c46"/>
      <polygon points="57.4,90.4 63,85.2 70.6,85.6" fill="#b4dc80"/><polygon points="57.4,90.4 70.6,85.6 65,90.8" fill="#5e8c46"/>
      <polygon points="69,85 71.9,77.9 79,75" fill="#b4dc80"/><polygon points="69,85 79,75 76.1,82.1" fill="#5e8c46"/>
      <polygon points="77.6,74.6 77.2,67 82.4,61.4" fill="#b4dc80"/><polygon points="77.6,74.6 82.4,61.4 82.8,69" fill="#5e8c46"/>
      <polygon points="82,62 79,55 82,48" fill="#b4dc80"/><polygon points="82,62 82,48 85,55" fill="#5e8c46"/>
      <polygon points="82.4,48.6 77.2,43 77.6,35.4" fill="#b4dc80"/><polygon points="82.4,48.6 77.6,35.4 82.8,41" fill="#5e8c46"/>
      <polygon points="78,36.7 71.5,32.7 70,25.3" fill="#b4dc80"/><polygon points="78,36.7 70,25.3 76.5,29.3" fill="#5e8c46"/>
      <path d="M42.6 90.4L37 85.2L29.4 85.6L35 90.8ZM31 85L28.1 77.9L21 75L23.9 82.1ZM22.4 74.6L22.8 67L17.6 61.4L17.2 69ZM18 62L21 55L18 48L15 55ZM17.6 48.6L22.8 43L22.4 35.4L17.2 41ZM22 36.7L28.5 32.7L30 25.3L23.5 29.3ZM57.4 90.4L63 85.2L70.6 85.6L65 90.8ZM69 85L71.9 77.9L79 75L76.1 82.1ZM77.6 74.6L77.2 67L82.4 61.4L82.8 69ZM82 62L79 55L82 48L85 55ZM82.4 48.6L77.2 43L77.6 35.4L82.8 41ZM78 36.7L71.5 32.7L70 25.3L76.5 29.3Z" fill="none" stroke="#131a1d" strokeWidth="2.4"/>
      <polygon points="50,56 44.42,48.31 50,34" fill="#ffd66e"/><polygon points="50,56 50,34 55.58,48.31" fill="#f2b33d"/><polygon points="50,56 55.58,48.31 70.92,49.2" fill="#ffd66e"/><polygon points="50,56 70.92,49.2 59.04,58.94" fill="#c98a14"/><polygon points="50,56 59.04,58.94 62.93,73.8" fill="#f2b33d"/><polygon points="50,56 62.93,73.8 50,65.5" fill="#c98a14"/><polygon points="50,56 50,65.5 37.07,73.8" fill="#c98a14"/><polygon points="50,56 37.07,73.8 40.96,58.94" fill="#f2b33d"/><polygon points="50,56 40.96,58.94 29.08,49.2" fill="#f2b33d"/><polygon points="50,56 29.08,49.2 44.42,48.31" fill="#ffd66e"/>
      <polygon points="50,34 55.58,48.31 70.92,49.2 59.04,58.94 62.93,73.8 50,65.5 37.07,73.8 40.96,58.94 29.08,49.2 44.42,48.31" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <polygon points="50,90 40,98 43,90 37,85" fill="#e8664c"/><polygon points="50,90 60,98 57,90 63,85" fill="#c94a33"/><path d="M50 90L40 98L43 90L37 85ZM50 90L60 98L57 90L63 85Z" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
    </>
  ),
  roadBuilding: (
    <>
      <polygon points="38,30 62,30 62,44 38,44" fill="#e8dcc2"/><polygon points="38,30 50,30 50,44 38,44" fill="#fbf6ea"/><polygon points="34,30 50,15 50,30" fill="#e8664c"/><polygon points="50,15 66,30 50,30" fill="#c94a33"/><polygon points="46,34 54,34 54,44 46,44" fill="#131a1d"/><path d="M38 30V44H62V30M34 30L50 15L66 30Z" fill="none" stroke="#131a1d"/>
      <g transform="translate(30 68) rotate(-58)"><polygon points="-24,-7 24,-7 24,0 -24,0" fill="#e8664c"/><polygon points="-24,0 24,0 24,7 -24,7" fill="#962f20"/><polygon points="-24,-7 -16,-7 -24,0" fill="#f08a70"/><rect x="-24" y="-7" width="48" height="14" fill="none" stroke="#131a1d" strokeWidth="3.6"/></g>
      <g transform="translate(70 68) rotate(58)"><polygon points="-24,-7 24,-7 24,0 -24,0" fill="#e8664c"/><polygon points="-24,0 24,0 24,7 -24,7" fill="#962f20"/><polygon points="24,-7 16,-7 24,0" fill="#f08a70"/><rect x="-24" y="-7" width="48" height="14" fill="none" stroke="#131a1d" strokeWidth="3.6"/></g>
    </>
  ),
  yearOfPlenty: (
    <>
      <polygon points="12,30 26,44 42,50 60,52 78,46 73,60 56,68 38,64 22,50" fill="#d39a5c"/>
      <polygon points="12,30 22,50 38,64 56,68 73,60 68,74 56,80 38,76 18,62 10,48" fill="#855628"/>
      <polygon points="22,50 38,64 18,62" fill="#b07840"/><polygon points="38,64 56,68 38,76" fill="#b07840"/><polygon points="56,68 73,60 68,74" fill="#b07840"/>
      <path d="M26 44L22 50M42 50L38 64M60 52L56 68" fill="none" stroke="#131a1d" strokeWidth="2.4"/>
      <polygon points="12,30 26,44 42,50 60,52 78,46 68,74 56,80 38,76 18,62 10,48" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
      <path d="M12 30L11 22L17 19" fill="none" stroke="#131a1d"/>
      <polygon points="68,73 77,47 83,53 80,68" fill="#232d31" stroke="#131a1d"/>
      <polygon points="70,40 76,26 82,36" fill="#a9adb6"/><polygon points="76,26 88,24 82,36" fill="#c9ced6"/><polygon points="88,24 94,36 82,36" fill="#8d909b"/><polygon points="82,36 94,36 86,46" fill="#6b6f79"/><polygon points="70,40 82,36 86,46" fill="#8d909b"/>
      <polygon points="70,40 76,26 88,24 94,36 86,46" fill="none" stroke="#131a1d"/>
      <g transform="translate(84 70) rotate(-18)"><polygon points="-11,-5 11,-5 11,7 -11,7" fill="#c4673f"/><polygon points="-11,-5 -8,-9 14,-9 11,-5" fill="#d97b51"/><polygon points="11,-5 14,-9 14,3 11,7" fill="#93472a"/><path d="M-11 -5L-8 -9H14V3L11 7H-11ZM-11 -5H11V7M11 -5L14 -9" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
    </>
  ),
  monopoly: (
    <>
      <polygon points="19,42 23.2,26.5 42.2,37.5 41,42" fill="#d9573d"/><polygon points="23.2,26.5 34.5,15.2 45.5,34.2 42.2,37.5" fill="#e8664c"/><polygon points="34.5,15.2 50,11 50,33 45.5,34.2" fill="#f08a70"/><polygon points="50,11 65.5,15.2 54.5,34.2 50,33" fill="#c94a33"/><polygon points="65.5,15.2 76.8,26.5 57.8,37.5 54.5,34.2" fill="#b03c28"/><polygon points="76.8,26.5 81,42 59,42 57.8,37.5" fill="#962f20"/>
      <polygon points="19,42 30,42 30,60 19,60" fill="#d9573d"/><polygon points="30,42 41,42 41,60 30,60" fill="#c94a33"/><polygon points="59,42 70,42 70,60 59,60" fill="#c94a33"/><polygon points="70,42 81,42 81,60 70,60" fill="#962f20"/>
      <polygon points="19,60 30,60 30,72 19,72" fill="#eef1f4"/><polygon points="30,60 41,60 41,72 30,72" fill="#b3b8c1"/><polygon points="59,60 70,60 70,72 59,72" fill="#c9ced6"/><polygon points="70,60 81,60 81,72 70,72" fill="#868c96"/>
      <path d="M19 72V42L23.2 26.5L34.5 15.2L50 11L65.5 15.2L76.8 26.5L81 42V72H59V42L57.8 37.5L54.5 34.2L50 33L45.5 34.2L42.2 37.5L41 42V72ZM19 60H41M59 60H81" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <path d="M44 77L42 73M56 77L58 73M50 75V70" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
      <g transform="translate(29 87) rotate(-20)"><rect x="-8" y="-10" width="16" height="20" fill="#e9c35a"/><polygon points="-8,-10 8,-10 -8,10" fill="#f7dc83"/><rect x="-8" y="-10" width="16" height="20" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
      <g transform="translate(71 87) rotate(18)"><rect x="-8" y="-10" width="16" height="20" fill="#8fc35e"/><polygon points="-8,-10 8,-10 -8,10" fill="#b4dc80"/><rect x="-8" y="-10" width="16" height="20" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
      <g transform="translate(50 86) rotate(-4)"><rect x="-8" y="-10" width="16" height="20" fill="#c4673f"/><polygon points="-8,-10 8,-10 -8,10" fill="#d97b51"/><rect x="-8" y="-10" width="16" height="20" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
    </>
  ),
};

export const PROGRESS_ART: Record<ProgressCardType, React.ReactNode> = {
  alchemist: (
    <>
      <polygon points="29,9 47,9 47,15 29,15" fill="#232d31" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="33,15 38,15 38,38 33,38" fill="#fbf6ea"/><polygon points="38,15 43,15 43,38 38,38" fill="#e8dcc2"/>
      <polygon points="22,44 33,38 38,60 15.2,60" fill="#fbf6ea"/><polygon points="33,38 43,38 38,60" fill="#f1e8d4"/><polygon points="43,38 54,44 60.8,60 38,60" fill="#e8dcc2"/>
      <polygon points="15.2,60 38,60 38,82.8 22,76" fill="#ffd66e"/><polygon points="38,60 60.8,60 54,76 38,82.8" fill="#f2b33d"/><polygon points="38,82.8 54,76 46,70" fill="#c98a14"/>
      <g fill="#fbf6ea" stroke="#131a1d" strokeWidth="2.2"><polygon points="28,70 31,67 34,70 31,73"/><polygon points="42,66 44,64 46,66 44,68"/><polygon points="35,52 37.5,49.5 40,52 37.5,54.5"/></g>
      <path d="M33 15V38L22 44L15.2 60L22 76L38 82.8L54 76L60.8 60L54 44L43 38V15ZM15.2 60H60.8" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <polygon points="76,19 87,25 76,31 65,25" fill="#ffd66e"/><polygon points="65,25 76,31 76,44 65,38" fill="#f2b33d"/><polygon points="76,31 87,25 87,38 76,44" fill="#c98a14"/>
      <g fill="#131a1d"><circle cx="76" cy="25" r="2.4"/><circle cx="68.5" cy="30.5" r="2.1"/><circle cx="72.5" cy="38.5" r="2.1"/><circle cx="81.5" cy="34.5" r="2.1"/></g>
      <path d="M65 25L76 19L87 25V38L76 44L65 38ZM65 25L76 31L87 25M76 31V44" fill="none" stroke="#131a1d" strokeWidth="3.2"/>
      <polygon points="76,59 87,65 76,71 65,65" fill="#e8664c"/><polygon points="65,65 76,71 76,84 65,78" fill="#c94a33"/><polygon points="76,71 87,65 87,78 76,84" fill="#962f20"/>
      <g fill="#fbf6ea"><circle cx="72" cy="65" r="2.2"/><circle cx="80" cy="65" r="2.2"/><circle cx="68.5" cy="70.5" r="2.1"/><circle cx="72.5" cy="78.5" r="2.1"/><circle cx="81.5" cy="74.5" r="2.1"/></g>
      <path d="M65 65L76 59L87 65V78L76 84L65 78ZM65 65L76 71L87 65M76 71V84" fill="none" stroke="#131a1d" strokeWidth="3.2"/>
    </>
  ),
  crane: (
    <>
      <polygon points="12,96 20,84 30,84 30,96" fill="#6b6f79"/><polygon points="30,84 40,84 48,96 30,96" fill="#4b5059"/><path d="M12 96L20 84H40L48 96Z" fill="none" stroke="#131a1d"/>
      <polygon points="26,22 32,22 32,86 26,86" fill="#d39a5c"/><polygon points="32,22 35,20 35,84 32,86" fill="#855628"/><path d="M26 86V22H32L35 20V84L32 86ZM32 22V86" fill="none" stroke="#131a1d"/>
      <polygon points="33,50 58,22 62,24 37,53" fill="#b07840" stroke="#131a1d"/>
      <polygon points="12,13 21,13 21,26 12,26" fill="#6b6f79"/><polygon points="12,13 15,10 24,10 21,13" fill="#a9adb6"/><polygon points="21,13 24,10 24,23 21,26" fill="#4b5059"/><path d="M12 13L15 10H24V23L21 26H12ZM12 13H21V26M21 13L24 10" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="20,14 88,14 88,22 20,22" fill="#d39a5c"/><polygon points="20,14 23,11 91,11 88,14" fill="#e8b47a"/><polygon points="88,14 91,11 91,19 88,22" fill="#855628"/><path d="M20 14L23 11H91V19L88 22H20ZM20 14H88V22M88 14L91 11" fill="none" stroke="#131a1d"/>
      <path d="M80 22V54M80 54L69 66M80 54L91 66" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="66,68 90,68 90,86 66,86" fill="#8d909b"/><polygon points="66,68 70,64 94,64 90,68" fill="#c9ced6"/><polygon points="90,68 94,64 94,82 90,86" fill="#6b6f79"/><polygon points="66,68 78,68 66,80" fill="#a9adb6"/>
      <path d="M66 68L70 64H94V82L90 86H66ZM66 68H90V86M90 68L94 64" fill="none" stroke="#131a1d"/>
    </>
  ),
  engineer: (
    <>
      <polygon points="12,94 12,48 22,48 22,56 32,56 32,48 42,48 42,56 56,56 56,48 66,48 66,56 76,56 76,48 86,48 86,94" fill="#e8dcc2"/>
      <g fill="#fbf6ea"><polygon points="12,56 32,56 32,68 12,68"/><polygon points="42,68 66,68 66,81 42,81"/><polygon points="12,81 32,81 32,94 12,94"/><polygon points="12,48 22,48 22,56 12,56"/><polygon points="32,48 42,48 42,56 32,56"/></g>
      <g fill="#cdbd9c"><polygon points="56,56 76,56 76,68 56,68"/><polygon points="22,68 42,68 42,81 22,81"/><polygon points="66,81 86,81 86,94 66,94"/><polygon points="76,48 86,48 86,56 76,56"/></g>
      <polygon points="86,48 90,45 90,91 86,94" fill="#b9a57f"/>
      <g fill="#fbf6ea"><polygon points="12,48 16,45 26,45 22,48"/><polygon points="32,48 36,45 46,45 42,48"/><polygon points="56,48 60,45 70,45 66,48"/><polygon points="76,48 80,45 90,45 86,48"/></g>
      <path d="M12 68H86M12 81H86M32 56V68M56 56V68M76 56V68M22 68V81M42 68V81M66 68V81M32 81V94M66 81V94" fill="none" stroke="#131a1d" strokeWidth="2.4"/>
      <polygon points="40,94 40,82 44,75 50,72 56,75 60,82 60,94" fill="#232d31" stroke="#131a1d"/>
      <path d="M12 94V48H22V56H32V48H42V56H56V48H66V56H76V48H86V94ZM12 48L16 45H26L22 48M32 48L36 45H46L42 48M56 48L60 45H70L66 48M76 48L80 45H90V91L86 94M86 48L90 45" fill="none" stroke="#131a1d" strokeWidth="3.4"/>
      <polygon points="47,17 51,17 38,41 34,39" fill="#dfe3e8" stroke="#131a1d" strokeWidth="2.8"/><polygon points="49,17 53,17 66,39 62,41" fill="#b3b8c1" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="50,7 55,10 55,16 50,19 45,16 45,10" fill="#f2b33d" stroke="#131a1d" strokeWidth="2.8"/>
    </>
  ),
  inventor: (
    <>
      <polygon points="50,5 56,9 56,15 50,19 44,15 44,9" fill="#ffd66e"/><polygon points="50,12 56,15 50,19 44,15" fill="#f2b33d"/><polygon points="47,19 53,19 53,23 47,23" fill="#6b6f79"/><path d="M50 5L56 9V15L50 19L44 15V9ZM47 19V23H53V19" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
      <path d="M30 38L40 30L50 27L60 30L67 35" fill="none" stroke="#131a1d" strokeWidth="5"/><polygon points="72,40 62.8,37.8 69.8,30.8" fill="#131a1d" stroke="#131a1d" strokeWidth="2.4"/>
      <path d="M70 80L60 87L50 89L40 87L33 83" fill="none" stroke="#131a1d" strokeWidth="5"/><polygon points="28,78.5 37.3,79.6 31.1,87.4" fill="#131a1d" stroke="#131a1d" strokeWidth="2.4"/>
      <polygon points="13.3,58 13.3,51.5 22.5,42.3 35.5,42.3 44.7,51.5 44.7,58" fill="#2a7d8e"/><polygon points="13.3,58 44.7,58 44.7,64.5 35.5,73.7 22.5,73.7 13.3,64.5" fill="#164555"/>
      <polygon points="17.5,53.2 24.2,46.5 33.8,46.5 40.5,53.2 40.5,62.8 33.8,69.5 24.2,69.5 17.5,62.8" fill="#fbf6ea"/><polygon points="17.5,58 40.5,58 40.5,62.8 33.8,69.5 24.2,69.5 17.5,62.8" fill="#efe5cf"/>
      <polygon points="44.7,64.5 35.5,73.7 22.5,73.7 13.3,64.5 13.3,51.5 22.5,42.3 35.5,42.3 44.7,51.5" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <text x="29" y="65" textAnchor="middle" fontFamily="Figtree, sans-serif" fontWeight="900" fontSize="18" fill="#131a1d">5</text>
      <polygon points="55.3,58 55.3,51.5 64.5,42.3 77.5,42.3 86.7,51.5 86.7,58" fill="#2a7d8e"/><polygon points="55.3,58 86.7,58 86.7,64.5 77.5,73.7 64.5,73.7 55.3,64.5" fill="#164555"/>
      <polygon points="59.5,53.2 66.2,46.5 75.8,46.5 82.5,53.2 82.5,62.8 75.8,69.5 66.2,69.5 59.5,62.8" fill="#fbf6ea"/><polygon points="59.5,58 82.5,58 82.5,62.8 75.8,69.5 66.2,69.5 59.5,62.8" fill="#efe5cf"/>
      <polygon points="86.7,64.5 77.5,73.7 64.5,73.7 55.3,64.5 55.3,51.5 64.5,42.3 77.5,42.3 86.7,51.5" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <text x="71" y="65" textAnchor="middle" fontFamily="Figtree, sans-serif" fontWeight="900" fontSize="18" fill="#131a1d">9</text>
    </>
  ),
  irrigation: (
    <>
      <polygon points="8,84 92,84 92,98 8,98" fill="#3e97ad"/>
      <g fill="#6cc0d1"><polygon points="8,84 20,84 8,92"/><polygon points="24,84 40,84 30,90"/><polygon points="52,84 66,84 58,90"/><polygon points="76,84 92,84 84,90"/></g>
      <g fill="#2c7d93"><polygon points="16,98 30,90 40,98"/><polygon points="48,98 58,90 72,98"/><polygon points="84,90 92,93 92,98 78,98"/></g>
      <path d="M8 84H92V98H8Z" fill="none" stroke="#131a1d"/>
      <path d="M52 84L44 42M57 84L59 34M62 84L74 44" fill="none" stroke="#131a1d" strokeWidth="3.4"/>
      <polygon points="54,72 46,65 40,68" fill="#8fc35e" stroke="#131a1d" strokeWidth="2.6"/><polygon points="60,66 68,59 74,62" fill="#5e8c46" stroke="#131a1d" strokeWidth="2.6"/>
      <g transform="translate(42 32) rotate(-12)"><polygon points="0,-13 -5,-6 -5,6 0,13" fill="#f7dc83"/><polygon points="0,-13 5,-6 5,6 0,13" fill="#d6ab44"/><path d="M0 -13L5 -6V6L0 13L-5 6V-6ZM-5 -2L0 1L5 -2M-5 5L0 8L5 5" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <g transform="translate(59 23)"><polygon points="0,-13 -5,-6 -5,6 0,13" fill="#f7dc83"/><polygon points="0,-13 5,-6 5,6 0,13" fill="#d6ab44"/><path d="M0 -13L5 -6V6L0 13L-5 6V-6ZM-5 -2L0 1L5 -2M-5 5L0 8L5 5" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <g transform="translate(76 34) rotate(14)"><polygon points="0,-13 -5,-6 -5,6 0,13" fill="#f7dc83"/><polygon points="0,-13 5,-6 5,6 0,13" fill="#d6ab44"/><path d="M0 -13L5 -6V6L0 13L-5 6V-6ZM-5 -2L0 1L5 -2M-5 5L0 8L5 5" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <polygon points="24,14 24,50 17,47 13,39 17,28" fill="#6cc0d1"/><polygon points="24,14 31,28 35,39 31,47 24,50" fill="#3e97ad"/><polygon points="24,50 31,47 35,39 27,42" fill="#2c7d93"/>
      <polygon points="24,14 31,28 35,39 31,47 24,50 17,47 13,39 17,28" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <polygon points="27,54 30,59 30,63 27,65 24,63 24,59" fill="#6cc0d1" stroke="#131a1d" strokeWidth="2.6"/>
    </>
  ),
  medicine: (
    <>
      <polygon points="55.6,49.6 75.6,12.6 80,15 60,52" fill="#d39a5c"/><polygon points="60,52 80,15 84.4,17.4 64.4,54.4" fill="#855628"/><polygon points="55.6,49.6 75.6,12.6 84.4,17.4 64.4,54.4" fill="none" stroke="#131a1d"/>
      <path d="M26 47L23 36L25 24L30 13" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <g transform="translate(18 34) rotate(25)"><polygon points="-7,0 0,-3.8 7,0" fill="#b4dc80"/><polygon points="-7,0 7,0 0,3.8" fill="#5e8c46"/><polygon points="-7,0 0,-3.8 7,0 0,3.8" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <g transform="translate(33 27) rotate(-30)"><polygon points="-7,0 0,-3.8 7,0" fill="#b4dc80"/><polygon points="-7,0 7,0 0,3.8" fill="#5e8c46"/><polygon points="-7,0 0,-3.8 7,0 0,3.8" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <g transform="translate(22 18) rotate(35)"><polygon points="-6,0 0,-3.4 6,0" fill="#b4dc80"/><polygon points="-6,0 6,0 0,3.4" fill="#5e8c46"/><polygon points="-6,0 0,-3.4 6,0 0,3.4" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <polygon points="16,48 20,45 80,45 84,48" fill="#fbf6ea"/><polygon points="16,48 84,48 84,57 16,57" fill="#cdbd9c"/><path d="M16 57V48L20 45H80L84 48V57ZM16 48H84" fill="none" stroke="#131a1d"/>
      <polygon points="20,57 50,57 50,86 34,82 24,72" fill="#e8dcc2"/><polygon points="50,57 80,57 76,72 66,82 50,86" fill="#cdbd9c"/><polygon points="66,82 76,72 80,57 64,70" fill="#b9a57f"/>
      <polygon points="38,86 62,86 66,95 34,95" fill="#b9a57f"/>
      <path d="M20 57H80L76 72L66 82L50 86L34 82L24 72ZM38 86L34 95H66L62 86" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <polygon points="41,63 47,63 47,67 51,67 51,73 47,73 47,77 41,77 41,73 37,73 37,67 41,67" fill="#c94a33" stroke="#131a1d" strokeWidth="2.6"/>
    </>
  ),
  mining: (
    <>
      <polygon points="38,58 46,76 22,70" fill="#a9adb6"/><polygon points="38,58 60,60 46,76" fill="#c9ced6"/><polygon points="60,60 78,68 68,80" fill="#8d909b"/><polygon points="60,60 68,80 46,76" fill="#a9adb6"/><polygon points="16,96 22,70 46,76 52,96" fill="#8d909b"/><polygon points="46,76 68,80 52,96" fill="#6b6f79"/><polygon points="68,80 86,96 52,96" fill="#5a5e67"/><polygon points="78,68 86,96 68,80" fill="#6b6f79"/>
      <path d="M38 58L46 76L22 70M46 76L60 60M46 76L52 96M60 60L68 80M78 68L68 80L86 96M68 80L52 96" fill="none" stroke="#131a1d" strokeWidth="2.2"/>
      <g fill="#ffd66e" stroke="#131a1d" strokeWidth="2"><polygon points="28,84 31,80 34,84 31,88"/><polygon points="55,68 57.5,64.5 60,68 57.5,71.5"/></g>
      <polygon points="16,96 22,70 38,58 60,60 78,68 86,96" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
      <polygon points="25.1,24 28,22 64,74 61.1,76" fill="#d39a5c"/><polygon points="28,22 30.9,20 66.9,72 64,74" fill="#855628"/><polygon points="25.1,24 30.9,20 66.9,72 61.1,76" fill="none" stroke="#131a1d"/>
      <polygon points="5,36 12,21 28,10 50,5 50.5,7.5 29,13 14.5,23.5 8,37.5" fill="#eef1f4"/><polygon points="8,37.5 14.5,23.5 29,13 50.5,7.5 51,10 30,16 17,26 11,39" fill="#868c96"/>
      <polygon points="5,36 12,21 28,10 50,5 51,10 30,16 17,26 11,39" fill="none" stroke="#131a1d"/>
    </>
  ),
  printer: (
    <>
      <polygon points="20,12 27,12 27,92 20,92" fill="#b07840"/><polygon points="27,12 30,10 30,90 27,92" fill="#855628"/><path d="M20 92V12H27L30 10V90L27 92ZM27 12V92" fill="none" stroke="#131a1d"/>
      <polygon points="72,12 79,12 79,92 72,92" fill="#b07840"/><polygon points="79,12 82,10 82,90 79,92" fill="#855628"/><path d="M72 92V12H79L82 10V90L79 92ZM79 12V92" fill="none" stroke="#131a1d"/>
      <polygon points="14,12 86,12 86,20 14,20" fill="#d39a5c"/><polygon points="14,12 18,8 90,8 86,12" fill="#e8b47a"/><polygon points="86,12 90,8 90,16 86,20" fill="#855628"/><path d="M14 12L18 8H90V16L86 20H14ZM14 12H86V20M86 12L90 8" fill="none" stroke="#131a1d"/>
      <polygon points="45,20 50,20 50,44 45,44" fill="#eef1f4"/><polygon points="50,20 55,20 55,44 50,44" fill="#b3b8c1"/><path d="M45 20H55V44H45ZM45 26L55 23M45 32L55 29M45 38L55 35" fill="none" stroke="#131a1d" strokeWidth="2.6"/>
      <polygon points="31,31 69,26 69,30 31,35" fill="#868c96" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="31,29 34,31 34,35 31,37 28,35 28,31" fill="#232d31"/><polygon points="69,24 72,26 72,30 69,32 66,30 66,26" fill="#232d31"/>
      <polygon points="34,44 66,44 66,52 34,52" fill="#6b6f79"/><polygon points="34,44 66,44 66,47 34,47" fill="#a9adb6"/><path d="M34 44H66V52H34Z" fill="none" stroke="#131a1d"/>
      <polygon points="30,58 70,58 30,82" fill="#fbf6ea"/><polygon points="70,58 70,82 30,82" fill="#efe5cf"/><path d="M30 58H70V82H30ZM34 63H44M56 63H66M34 77.5H44M56 77.5H66" fill="none" stroke="#131a1d" strokeWidth="2.6"/>
      <polygon points="50,62 52,67.25 57.6,67.5 53.2,71.1 54.7,76.5 50,73.4 45.3,76.5 46.8,71.1 42.4,67.5 48,67.25" fill="#f2b33d"/><polygon points="50,70 50,62 52,67.25 57.6,67.5 53.2,71.1 54.7,76.5 50,73.4" fill="#c98a14"/>
      <polygon points="50,62 52,67.25 57.6,67.5 53.2,71.1 54.7,76.5 50,73.4 45.3,76.5 46.8,71.1 42.4,67.5 48,67.25" fill="none" stroke="#131a1d" strokeWidth="2.4"/>
      <polygon points="14,86 86,86 86,94 14,94" fill="#855628"/><polygon points="14,86 18,83 82,83 86,86" fill="#b07840"/><path d="M14 86L18 83H82L86 86V94H14ZM14 86H86" fill="none" stroke="#131a1d"/>
    </>
  ),
  roadBuilding: (
    <>
      <polygon points="26,98 38,90 50,88 50,98" fill="#8fc35e"/><polygon points="50,88 62,90 74,98 50,98" fill="#5e8c46"/><path d="M26 98L38 90L50 88L62 90L74 98Z" fill="none" stroke="#131a1d"/>
      <polygon points="46,20 50,20 50,92 46,92" fill="#d39a5c"/><polygon points="50,20 54,20 54,92 50,92" fill="#855628"/><path d="M46 92V20H54V92" fill="none" stroke="#131a1d"/>
      <polygon points="44,21 50,13 50,21" fill="#e8664c"/><polygon points="50,13 56,21 50,21" fill="#962f20"/><path d="M44 21L50 13L56 21Z" fill="none" stroke="#131a1d"/>
      <polygon points="12,34 21,25 47,25 47,34" fill="#fbf6ea"/><polygon points="12,34 47,34 47,43 21,43" fill="#e8dcc2"/><path d="M12 34L21 25H47V43H21ZM25 34H42" fill="none" stroke="#131a1d"/>
      <polygon points="88,56 79,47 53,47 53,56" fill="#fbf6ea"/><polygon points="88,56 53,56 53,65 79,65" fill="#e8dcc2"/><path d="M88 56L79 47H53V65H79ZM58 56H75" fill="none" stroke="#131a1d"/>
      <g transform="translate(23 87) rotate(-10)"><polygon points="-15,-4.5 15,-4.5 15,0 -15,0" fill="#e8664c"/><polygon points="-15,0 15,0 15,4.5 -15,4.5" fill="#962f20"/><rect x="-15" y="-4.5" width="30" height="9" fill="none" stroke="#131a1d" strokeWidth="3"/></g>
      <g transform="translate(77 87) rotate(10)"><polygon points="-15,-4.5 15,-4.5 15,0 -15,0" fill="#e8664c"/><polygon points="-15,0 15,0 15,4.5 -15,4.5" fill="#962f20"/><rect x="-15" y="-4.5" width="30" height="9" fill="none" stroke="#131a1d" strokeWidth="3"/></g>
    </>
  ),
  smith: (
    <>
      <polygon points="32,82 72,82 72,96 32,96" fill="#b07840"/><polygon points="52,82 72,82 72,96 52,96" fill="#855628"/><path d="M32 82H72V96H32Z" fill="none" stroke="#131a1d"/>
      <polygon points="14,46 72,46 96,42 90,56 70,58 64,58 64,68 74,82 30,82 40,68 40,58 24,58 14,52" fill="#4b5059"/>
      <polygon points="14,46 18,42 72,42 96,38 96,42 72,46" fill="#a9adb6"/>
      <polygon points="72,46 96,42 90,56 70,58" fill="#5f646d"/><polygon points="52,68 64,68 74,82 52,82" fill="#3a3f47"/><polygon points="14,46 40,46 40,58 24,58 14,52" fill="#6b6f79"/>
      <path d="M14 46L18 42H72L96 38V42L90 56L70 58H64V68L74 82H30L40 68V58H24L14 52ZM14 46H72L96 42" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <g fill="#f2b33d" stroke="#131a1d" strokeWidth="2.2"><polygon points="34,38 28,29 37,34"/><polygon points="41,35 40,24 44,33"/><polygon points="30,44 20,40 30,41"/><polygon points="48,37 53,28 51,37"/></g>
      <polygon points="58.3,28.2 82.3,6.2 84,8 60,30" fill="#d39a5c"/><polygon points="60,30 84,8 85.7,9.8 61.7,31.8" fill="#855628"/><polygon points="58.3,28.2 82.3,6.2 85.7,9.8 61.7,31.8" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <g transform="translate(58 33) rotate(47.5)"><polygon points="-13,-6.5 13,-6.5 13,0 -13,0" fill="#eef1f4"/><polygon points="-13,0 13,0 13,6.5 -13,6.5" fill="#868c96"/><rect x="-13" y="-6.5" width="26" height="13" fill="none" stroke="#131a1d" strokeWidth="3.4"/></g>
    </>
  ),
  bishop: (
    <>
      <g transform="translate(-7 0)">
      <polygon points="30,46 34,34 46,16 50,30 50,46" fill="#fbf6ea"/><polygon points="50,30 54,16 66,34 70,46 50,46" fill="#e8dcc2"/><polygon points="28,92 30,46 50,46 50,92" fill="#f1e8d4"/><polygon points="50,46 70,46 72,92 50,92" fill="#cdbd9c"/>
      <polygon points="47,40 53,40 53,48 59,48 59,54 53,54 53,66 47,66 47,54 41,54 41,48 47,48" fill="#f2b33d" stroke="#131a1d" strokeWidth="2.8"/><polygon points="50,40 53,40 53,48 59,48 59,54 53,54 53,66 50,66" fill="#c98a14"/>
      <polygon points="28,78 72,78 72,92 28,92" fill="#232d31"/><polygon points="28,78 72,78 72,83 28,83" fill="#3a464b"/>
      <g fill="#f2b33d"><polygon points="35,82 37.5,85 35,88 32.5,85"/><polygon points="50,82 52.5,85 50,88 47.5,85"/><polygon points="65,82 67.5,85 65,88 62.5,85"/></g>
      <path d="M28 92L30 46L34 34L46 16L50 30L54 16L66 34L70 46L72 92ZM28 78H72" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
      </g>
      <path d="M68 24L80 26L85 34L85 45" fill="none" stroke="#131a1d" strokeWidth="3.8"/><polygon points="80,43 85,52 90,43" fill="#131a1d" stroke="#131a1d" strokeWidth="2"/>
      <polygon points="84,55 88.6,57 90.5,61.5 84,61.5" fill="#4b585c"/><polygon points="84,55 79.4,57 77.5,61.5 84,61.5" fill="#5f6c71"/><polygon points="77.5,61.5 90.5,61.5 88.6,66 84,68 79.4,66" fill="#232d31"/>
      <polygon points="75,94 77,80 84,70 84,94" fill="#4b585c"/><polygon points="84,70 91,80 93,94 84,94" fill="#232d31"/>
      <path d="M84 55L88.6 57L90.5 61.5L88.6 66L84 68L79.4 66L77.5 61.5L79.4 57ZM75 94L77 80L84 70L91 80L93 94Z" fill="none" stroke="#131a1d"/>
    </>
  ),
  constitution: (
    <>
      <polygon points="26,20 74,20 26,80" fill="#fbf6ea"/><polygon points="74,20 74,80 26,80" fill="#efe5cf"/>
      <path d="M26 20H74V80H26Z" fill="none" stroke="#131a1d"/>
      <path d="M33 31H67" fill="none" stroke="#131a1d" strokeWidth="4"/><path d="M33 41H67M33 49H67M33 57H52" fill="none" stroke="#131a1d" strokeWidth="2.6"/>
      <polygon points="18,17.5 82,17.5 82,12 18,12" fill="#d39a5c"/><polygon points="18,17.5 82,17.5 82,23 18,23" fill="#855628"/><path d="M18 12H82V23H18Z" fill="none" stroke="#131a1d"/>
      <polygon points="18,82.5 82,82.5 82,77 18,77" fill="#d39a5c"/><polygon points="18,82.5 82,82.5 82,88 18,88" fill="#855628"/><path d="M18 77H82V88H18Z" fill="none" stroke="#131a1d"/>
      <polygon points="60,70 55,95 60,91 63,96 66,72" fill="#c94a33" stroke="#131a1d" strokeWidth="2.8"/><polygon points="68,70 74,94 69,91 66,95 63,72" fill="#962f20" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="64,56 71,59 74,66 64,66" fill="#e8664c"/><polygon points="64,56 57,59 54,66 64,66" fill="#f08a70"/><polygon points="54,66 74,66 71,73 64,76 57,73" fill="#962f20"/>
      <path d="M64 56L71 59L74 66L71 73L64 76L57 73L54 66L57 59Z" fill="none" stroke="#131a1d"/>
      <path d="M64 61L65.4 64.3L69 64.6L66.3 66.9L67.1 70.4L64 68.5L60.9 70.4L61.7 66.9L59 64.6L62.6 64.3Z" fill="#fbf6ea"/>
    </>
  ),
  deserter: (
    <>
      <path d="M22 40V15" fill="none" stroke="#131a1d"/>
      <polygon points="22,16 37,16 33,21.5 22,21.5" fill="#fbf6ea"/><polygon points="22,21.5 33,21.5 37,27 22,27" fill="#e8dcc2"/><path d="M22 16H37L33 21.5L37 27H22Z" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="35.9,59.7 27.7,67.9 16.3,67.9 8.1,59.7 8.1,48.3 16.3,40.1 27.7,40.1 35.9,48.3" fill="#fbf6ea" stroke="#131a1d" strokeDasharray="5 3.5"/>
      <path d="M15 64V52L18 46H26L29 52V64Z" fill="none" stroke="#131a1d" strokeWidth="3" strokeDasharray="3 2.5"/>
      <polygon points="41,51 50,51 50,46 59,54 50,62 50,57 41,57" fill="#fbf6ea" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="61.3,54 61.3,47 67.5,40.2 86.5,40.2 92.7,47 92.7,54" fill="#3a464b"/><polygon points="61.3,54 92.7,54 92.7,61 86.5,67.8 67.5,67.8 61.3,61" fill="#1b2326"/>
      <polygon points="92.7,61 86.5,67.8 67.5,67.8 61.3,61 61.3,47 67.5,40.2 86.5,40.2 92.7,47" fill="none" stroke="#131a1d"/>
      <polygon points="69,66 69,51 72,45 77,43 77,66" fill="#fbf6ea"/><polygon points="77,43 82,45 85,51 85,66 77,66" fill="#d9cbab"/>
      <polygon points="69,50 85,50 85,53.5 69,53.5" fill="#131a1d"/><polygon points="75.8,53.5 78.2,53.5 78.2,66 75.8,66" fill="#131a1d"/>
      <g fill="#131a1d"><polygon points="17,76 20.5,81 17,86 13.5,81"/><polygon points="27,76 30.5,81 27,86 23.5,81"/><polygon points="72,76 75.5,81 72,86 68.5,81"/><polygon points="82,76 85.5,81 82,86 78.5,81"/></g>
    </>
  ),
  diplomat: (
    <>
      <polygon points="14,88 86,88 86,98 14,98" fill="#8fc35e"/><g fill="#5e8c46"><polygon points="14,94 28,88 40,98 14,98"/><polygon points="54,98 68,88 82,98"/></g><g fill="#b4dc80"><polygon points="28,88 48,88 40,93"/><polygon points="68,88 86,88 86,92"/></g><path d="M14 88H86V98H14Z" fill="none" stroke="#131a1d"/>
      <rect x="24" y="76" width="44" height="12" rx="1" fill="none" stroke="#131a1d" strokeWidth="3" strokeDasharray="4 3"/>
      <g transform="translate(44 44) rotate(-22)"><polygon points="-24,-7 24,-7 24,0 -24,0" fill="#e8664c"/><polygon points="-24,0 24,0 24,7 -24,7" fill="#962f20"/><polygon points="-24,-7 -16,-7 -24,0" fill="#f08a70"/><rect x="-24" y="-7" width="48" height="14" fill="none" stroke="#131a1d" strokeWidth="3.6"/></g>
      <polygon points="79,78 85,78 85,46 91,46 82,32 73,46 79,46" fill="#fbf6ea"/><polygon points="82,32 91,46 85,46 85,78 82,78" fill="#e8dcc2"/><polygon points="79,78 85,78 85,46 91,46 82,32 73,46 79,46" fill="none" stroke="#131a1d" strokeWidth="3.2"/>
    </>
  ),
  intrigue: (
    <>
      <polygon points="30,42 22,24 32,6 34,24" fill="#e8664c"/><polygon points="30,42 34,24 32,6 38,40" fill="#962f20"/><path d="M30 42L22 24L32 6L38 40Z" fill="none" stroke="#131a1d"/>
      <polygon points="76.5,62 80,61 92,93 88.5,94" fill="#855628" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="12,44 22,39 32,38 42,40 50,44 50,60 38,68 26,68 16,62 12,54" fill="#3a464b"/><polygon points="50,44 58,40 68,38 78,39 88,44 88,54 84,62 74,68 62,68 50,60" fill="#232d31"/>
      <polygon points="12,44 22,39 32,38 42,40 50,44 30,48" fill="#5f6c71"/><polygon points="50,44 58,40 68,38 78,39 88,44 70,48" fill="#4b585c"/><polygon points="50,60 62,68 74,68 84,62 70,58" fill="#131a1d"/>
      <polygon points="24,52 33,46 42,52 33,57" fill="#3a74d8" stroke="#fbf6ea" strokeWidth="2.4"/><polygon points="58,52 67,46 76,52 67,57" fill="#3a74d8" stroke="#fbf6ea" strokeWidth="2.4"/>
      <polygon points="12,44 22,39 32,38 42,40 50,44 58,40 68,38 78,39 88,44 88,54 84,62 74,68 62,68 50,60 38,68 26,68 16,62 12,54" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <g transform="translate(42 84) rotate(-25)"><polygon points="0,-10 7,-7 10,0 0,0 -10,0 -7,-7" fill="#fbf6ea"/><polygon points="-10,0 10,0 7,7 0,10 -7,7" fill="#d9cbab"/><polygon points="0,-10 7,-7 10,0 7,7 0,10 -7,7 -10,0 -7,-7" fill="none" stroke="#131a1d" strokeWidth="3"/><polygon points="-4.5,6 -4.5,-1 -2,-5.5 2,-5.5 4.5,-1 4.5,6" fill="#131a1d"/></g>
      <path d="M57 80H67M56 88H63" fill="none" stroke="#131a1d" strokeWidth="3"/>
    </>
  ),
  saboteur: (
    <>
      <g transform="rotate(-12 34 52)"><polygon points="16,24 47,24 43,34 49,44 16,84" fill="#fbf6ea"/><polygon points="16,84 49,44 43,54 49,64 45,84" fill="#e8dcc2"/><path d="M16 24H47L43 34L49 44L43 54L49 64L45 84H16Z" fill="none" stroke="#131a1d" strokeWidth="3.6"/><path d="M22 30H40M22 30V78H38" fill="none" stroke="#131a1d" strokeWidth="2.6"/><polygon points="24,48 36,48 24,60" fill="#d97b51"/><polygon points="36,48 36,60 24,60" fill="#93472a"/><rect x="24" y="48" width="12" height="12" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <g transform="rotate(12 66 52)"><polygon points="53,24 84,24 84,60 55,44 49,34" fill="#fbf6ea"/><polygon points="84,60 84,84 51,84 55,64 49,54 55,44" fill="#e8dcc2"/><path d="M53 24H84V84H51L55 64L49 54L55 44L49 34Z" fill="none" stroke="#131a1d" strokeWidth="3.6"/><path d="M60 30H78V78H58" fill="none" stroke="#131a1d" strokeWidth="2.6"/><polygon points="64,48 76,48 64,60" fill="#d97b51"/><polygon points="76,48 76,60 64,60" fill="#93472a"/><rect x="64" y="48" width="12" height="12" fill="none" stroke="#131a1d" strokeWidth="2.6"/></g>
      <polygon points="50,2 53,10 61,8 56,15 62,20 54,20 50,28 46,20 38,20 44,15 39,8 47,10" fill="#ffd66e"/><polygon points="50,15 62,20 54,20 50,28 46,20" fill="#c98a14"/><polygon points="50,15 61,8 56,15" fill="#f2b33d"/>
      <polygon points="50,2 53,10 61,8 56,15 62,20 54,20 50,28 46,20 38,20 44,15 39,8 47,10" fill="none" stroke="#131a1d" strokeWidth="3"/>
    </>
  ),
  spy: (
    <>
      <g transform="rotate(-24 50 96)"><rect x="38" y="58" width="24" height="34" fill="#3f9b4f"/><polygon points="38,58 62,58 38,92" fill="#4fae5f"/><rect x="38" y="58" width="24" height="34" fill="none" stroke="#131a1d" strokeWidth="3.2"/></g>
      <g transform="rotate(24 50 96)"><rect x="38" y="58" width="24" height="34" fill="#d6ab44"/><polygon points="38,58 62,58 38,92" fill="#e9c35a"/><rect x="38" y="58" width="24" height="34" fill="none" stroke="#131a1d" strokeWidth="3.2"/></g>
      <rect x="38" y="56" width="24" height="36" fill="#efe5cf"/><polygon points="38,56 62,56 38,92" fill="#fbf6ea"/><rect x="38" y="56" width="24" height="36" fill="none" stroke="#131a1d" strokeWidth="3.2"/>
      <text x="50" y="82" textAnchor="middle" fontFamily="Figtree, sans-serif" fontWeight="900" fontSize="20" fill="#131a1d">?</text>
      <polygon points="14,34 26,24 38,19 50,18 62,19 74,24 86,34" fill="#fbf6ea"/><polygon points="14,34 86,34 74,44 62,49 50,50 38,49 26,44" fill="#e8dcc2"/>
      <polygon points="14,34 26,24 38,19 50,18 62,19 74,24 86,34 74,44 62,49 50,50 38,49 26,44" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
      <polygon points="50,22 58.5,25.5 62,34 50,34 38,34 41.5,25.5" fill="#3a464b"/><polygon points="38,34 62,34 58.5,42.5 50,46 41.5,42.5" fill="#131a1d"/>
      <polygon points="45,26 48,29 45,32 42,29" fill="#fbf6ea"/>
      <path d="M32 21L28 14M50 18V9M68 21L72 14" fill="none" stroke="#131a1d"/>
    </>
  ),
  warlord: (
    <>
      <polygon points="27.4,72.7 81,17 30,75" fill="#eef1f4"/><polygon points="30,75 81,17 32.6,77.3" fill="#868c96"/><polygon points="27.4,72.7 81,17 32.6,77.3" fill="none" stroke="#131a1d"/>
      <polygon points="72.6,72.7 19,17 70,75" fill="#b3b8c1"/><polygon points="70,75 19,17 67.4,77.3" fill="#eef1f4"/><polygon points="72.6,72.7 19,17 67.4,77.3" fill="none" stroke="#131a1d"/>
      <path d="M21.7 67.7L38.3 82.3M78.3 67.7L61.7 82.3M30 75L23 83M70 75L77 83" fill="none" stroke="#131a1d" strokeWidth="8"/>
      <path d="M21.7 67.7L38.3 82.3M78.3 67.7L61.7 82.3" fill="none" stroke="#f2b33d" strokeWidth="3.6"/><path d="M30 75L23 83M70 75L77 83" fill="none" stroke="#b07840" strokeWidth="3.6"/>
      <polygon points="21,81 24.5,83.5 24,87.5 20,89 17,86.5 17.5,82.5" fill="#f2b33d" stroke="#131a1d" strokeWidth="2.8"/><polygon points="79,81 82.5,82.5 83,86.5 80,89 76,87.5 75.5,83.5" fill="#f2b33d" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="37,34 50,34 50,69 43,62 37,52" fill="#e8664c"/><polygon points="50,34 63,34 63,52 57,62 50,69" fill="#c94a33"/>
      <path d="M37 34H63V52L57 62L50 69L43 62L37 52Z" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
      <path d="M42 46L50 40L58 46M42 55L50 49L58 55" fill="none" stroke="#fbf6ea" strokeWidth="3.4"/>
    </>
  ),
  wedding: (
    <>
      <polygon points="54,46 51.9,54 46,59.9 38,62 30,59.9 24.1,54 22,46 24.1,38 30,32.1 38,30 46,32.1 51.9,38" fill="none" stroke="#131a1d" strokeWidth="12"/><polygon points="54,46 51.9,54 46,59.9 38,62 30,59.9 24.1,54 22,46 24.1,38 30,32.1 38,30 46,32.1 51.9,38" fill="none" stroke="#f2b33d" strokeWidth="5.5"/><path d="M22 46L24.1 38L30 32.1L38 30" fill="none" stroke="#ffd66e" strokeWidth="5.5" strokeLinecap="butt"/>
      <polygon points="78,46 75.9,54 70,59.9 62,62 54,59.9 48.1,54 46,46 48.1,38 54,32.1 62,30 70,32.1 75.9,38" fill="none" stroke="#131a1d" strokeWidth="12"/><polygon points="78,46 75.9,54 70,59.9 62,62 54,59.9 48.1,54 46,46 48.1,38 54,32.1 62,30 70,32.1 75.9,38" fill="none" stroke="#f2b33d" strokeWidth="5.5"/><path d="M46 46L48.1 38L54 32.1L62 30" fill="none" stroke="#ffd66e" strokeWidth="5.5" strokeLinecap="butt"/><path d="M78 46L75.9 54L70 59.9L62 62" fill="none" stroke="#c98a14" strokeWidth="5.5" strokeLinecap="butt"/>
      <path d="M54 46L51.9 54L46 59.9L38 62" fill="none" stroke="#131a1d" strokeWidth="12" strokeLinecap="butt"/><path d="M54 46L51.9 54L46 59.9L38 62" fill="none" stroke="#c98a14" strokeWidth="5.5" strokeLinecap="butt"/>
      <polygon points="62,21 67.5,27 62,27" fill="#fbf6ea"/><polygon points="62,21 56.5,27 62,27" fill="#eef1f4"/><polygon points="56.5,27 67.5,27 62,33" fill="#a9cbcf"/><path d="M62 21L67.5 27L62 33L56.5 27Z" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="16,74 38,74 38,92 16,92" fill="#c94a33"/><polygon points="16,74 20,70 42,70 38,74" fill="#e8664c"/><polygon points="38,74 42,70 42,88 38,92" fill="#962f20"/><path d="M27 74V92M16 74L20 70H42V88L38 92H16ZM16 74H38V92M38 74L42 70M31 70L27 74" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="27,72 19,64 22,72" fill="#fbf6ea" stroke="#131a1d" strokeWidth="2.4"/><polygon points="27,72 35,64 32,72" fill="#e8dcc2" stroke="#131a1d" strokeWidth="2.4"/>
      <polygon points="62,74 84,74 84,92 62,92" fill="#e8dcc2"/><polygon points="62,74 66,70 88,70 84,74" fill="#fbf6ea"/><polygon points="84,74 88,70 88,88 84,92" fill="#b9a57f"/><path d="M73 74V92" fill="none" stroke="#c94a33" strokeWidth="3.4"/><path d="M62 74L66 70H88V88L84 92H62ZM62 74H84V92M84 74L88 70" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="73,72 65,64 68,72" fill="#e8664c" stroke="#131a1d" strokeWidth="2.4"/><polygon points="73,72 81,64 78,72" fill="#c94a33" stroke="#131a1d" strokeWidth="2.4"/>
    </>
  ),
  commercialHarbor: (
    <>
      <polygon points="10,90 20,86 30,90 40,86 50,90 60,86 70,90 80,86 90,90 90,96 10,96" fill="#3e97ad"/><g fill="#6cc0d1"><polygon points="10,90 20,86 30,90"/><polygon points="30,90 40,86 50,90"/><polygon points="50,90 60,86 70,90"/><polygon points="70,90 80,86 90,90"/></g><path d="M10 90L20 86L30 90L40 86L50 90L60 86L70 90L80 86L90 90V96H10Z" fill="none" stroke="#131a1d"/>
      <polygon points="44,9 48,11 50,15 48,19 44,21 40,19 38,15 40,11" fill="none" stroke="#131a1d" strokeWidth="8"/><polygon points="44,9 48,11 50,15 48,19 44,21 40,19 38,15 40,11" fill="none" stroke="#b3b8c1" strokeWidth="3.2"/>
      <path d="M22 62L26 76L36 83L44 84L52 83L62 76L66 62" fill="none" stroke="#131a1d" strokeWidth="10.5"/><path d="M22 62L26 76L36 83L44 84L52 83L62 76L66 62" fill="none" stroke="#868c96" strokeWidth="4.5"/><path d="M22 62L26 76L36 83L44 84" fill="none" stroke="#c9ced6" strokeWidth="4.5" strokeLinecap="butt"/>
      <polygon points="40.5,21 44,21 44,84 40.5,84" fill="#c9ced6"/><polygon points="44,21 47.5,21 47.5,84 44,84" fill="#6b6f79"/><path d="M40.5 21H47.5V84H40.5Z" fill="none" stroke="#131a1d"/>
      <polygon points="31,28 57,28 57,31 31,31" fill="#eef1f4"/><polygon points="31,31 57,31 57,34 31,34" fill="#868c96"/><path d="M31 28H57V34H31Z" fill="none" stroke="#131a1d"/>
      <polygon points="16,66 22,55 22,66" fill="#c9ced6"/><polygon points="22,55 28,66 22,66" fill="#6b6f79"/><polygon points="60,66 66,55 66,66" fill="#c9ced6"/><polygon points="66,55 72,66 66,66" fill="#6b6f79"/><path d="M16 66L22 55L28 66ZM60 66L66 55L72 66Z" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="70,68 88,68 88,88 70,88" fill="#b07840"/><polygon points="70,68 74,64 92,64 88,68" fill="#e8b47a"/><polygon points="88,68 92,64 92,84 88,88" fill="#855628"/><path d="M70 68L74 64H92V84L88 88H70ZM70 68H88V88M88 68L92 64M70 78H88M70 68L88 88" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <g transform="translate(80 50)"><polygon points="-10,-6 7,-6 7,0 -10,0" fill="#b4ebd2"/><polygon points="-10,0 7,0 7,6 -10,6" fill="#5fae8c"/><polygon points="7,-6 10,-3 10,3 7,6" fill="#8ed8b8"/><path d="M-10 -6H7L10 -3V3L7 6H-10ZM7 -6V6" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
    </>
  ),
  masterMerchant: (
    <>
      <g transform="rotate(14 67 30)"><rect x="56" y="14" width="22" height="30" fill="#c4673f"/><polygon points="56,14 78,14 56,44" fill="#d97b51"/><rect x="56" y="14" width="22" height="30" fill="none" stroke="#131a1d" strokeWidth="3.2"/></g>
      <g transform="rotate(32 72 36)"><rect x="62" y="20" width="22" height="30" fill="#8fc35e"/><polygon points="62,20 84,20 62,50" fill="#b4dc80"/><rect x="62" y="20" width="22" height="30" fill="none" stroke="#131a1d" strokeWidth="3.2"/></g>
      <polygon points="30,92 18,86 15,72 20,58 32,48 38,44 47,46 47,92" fill="#f1e8d4"/><polygon points="47,46 56,44 64,48 76,58 80,72 76,86 64,92 47,92" fill="#d9cbab"/><polygon points="64,92 76,86 80,72 66,78" fill="#b9a57f"/><polygon points="20,58 32,48 30,66" fill="#fbf6ea"/>
      <polygon points="33,32 46,36 60,32 56,44 38,44" fill="#d9cbab"/><polygon points="46,36 60,32 56,44" fill="#b9a57f"/>
      <path d="M30 92L18 86L15 72L20 58L32 48L38 44L33 32L46 36L60 32L56 44L64 48L76 58L80 72L76 86L64 92Z" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
      <polygon points="36,42 58,42 58,46 36,46" fill="#855628" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="45,60 52,63 55,70 45,70" fill="#f2b33d"/><polygon points="45,60 38,63 35,70 45,70" fill="#ffd66e"/><polygon points="35,70 55,70 52,77 45,80 38,77" fill="#c98a14"/>
      <path d="M45 60L52 63L55 70L52 77L45 80L38 77L35 70L38 63ZM45 64.5V75.5" fill="none" stroke="#131a1d" strokeWidth="3"/>
    </>
  ),
  merchant: (
    <>
      <polygon points="22.3,82 50,90 50,96 22.3,88" fill="#5e8c46"/><polygon points="50,90 77.7,82 77.7,88 50,96" fill="#46702a"/>
      <polygon points="50,58 77.7,66 50,74 22.3,66" fill="#b4dc80"/><polygon points="22.3,66 50,74 50,90 22.3,82" fill="#8fc35e"/><polygon points="50,74 77.7,66 77.7,82 50,90" fill="#7fb553"/>
      <path d="M50 58L77.7 66V88L50 96L22.3 88V66ZM22.3 82L50 90L77.7 82" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <polygon points="26,76 31,73.5 36,76 31,78.5" fill="#f2b33d" stroke="#131a1d" strokeWidth="2.4"/><polygon points="64,77 69,74.5 74,77 69,79.5" fill="#f2b33d" stroke="#131a1d" strokeWidth="2.4"/>
      <polygon points="39,80 44,50 50,50 50,80" fill="#e8664c"/><polygon points="50,50 56,50 61,80 50,80" fill="#962f20"/><path d="M39 80L44 50H56L61 80Z" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <polygon points="50,35 55.7,37.3 58,43 50,43 42,43 44.3,37.3" fill="#fbf6ea"/><polygon points="42,43 58,43 55.7,48.7 50,51 44.3,48.7" fill="#d9cbab"/><path d="M50 35L55.7 37.3L58 43L55.7 48.7L50 51L44.3 48.7L42 43L44.3 37.3Z" fill="none" stroke="#131a1d"/>
      <polygon points="36,38 42,28 50,25 50,35" fill="#3a464b"/><polygon points="50,25 58,28 64,38 50,35" fill="#232d31"/><path d="M36 38L42 28L50 25L58 28L64 38L50 35Z" fill="none" stroke="#131a1d"/>
    </>
  ),
  merchantFleet: (
    <>
      <polygon points="10,90 20,86 30,90 40,86 50,90 60,86 70,90 80,86 90,90 90,96 10,96" fill="#3e97ad"/><g fill="#6cc0d1"><polygon points="10,90 20,86 30,90"/><polygon points="30,90 40,86 50,90"/><polygon points="50,90 60,86 70,90"/><polygon points="70,90 80,86 90,90"/></g><path d="M10 90L20 86L30 90L40 86L50 90L60 86L70 90L80 86L90 90V96H10Z" fill="none" stroke="#131a1d"/>
      <polygon points="48,6 50,6 50,64 48,64" fill="#d39a5c"/><polygon points="50,6 52,6 52,64 50,64" fill="#855628"/><path d="M48 6H52V64H48Z" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="52,6 64,10 52,10" fill="#e8664c"/><polygon points="52,10 64,10 52,14" fill="#962f20"/><path d="M52 6L64 10L52 14Z" fill="none" stroke="#131a1d" strokeWidth="2.8"/>
      <polygon points="28,18 50,21 50,55 28,58 26,38" fill="#fbf6ea"/><polygon points="50,21 72,18 74,38 72,58 50,55" fill="#e8dcc2"/><polygon points="26,38 28,58 50,55 38,46" fill="#efe5cf"/>
      <path d="M28 18L50 21L72 18L74 38L72 58L50 55L28 58L26 38Z" fill="none" stroke="#131a1d" strokeWidth="3.8"/>
      <text x="50" y="45" textAnchor="middle" fontFamily="Figtree, sans-serif" fontWeight="900" fontSize="18" fill="#131a1d">2:1</text>
      <polygon points="12,64 88,64 85,69 15,69" fill="#d39a5c"/><polygon points="15,69 85,69 76,84 24,84" fill="#855628"/><polygon points="15,69 50,69 50,84 24,84" fill="#b07840"/>
      <path d="M12 64H88L76 84H24ZM15 69H85" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
    </>
  ),
  resourceMonopoly: (
    <>
      <g transform="translate(28 14) rotate(-20)"><polygon points="-11,-5 11,-5 11,7 -11,7" fill="#c4673f"/><polygon points="-11,-5 -8,-9 14,-9 11,-5" fill="#d97b51"/><polygon points="11,-5 14,-9 14,3 11,7" fill="#93472a"/><path d="M-11 -5L-8 -9H14V3L11 7H-11ZM-11 -5H11V7M11 -5L14 -9" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
      <g transform="translate(51 10) rotate(10)"><polygon points="-11,-5 11,-5 11,7 -11,7" fill="#c4673f"/><polygon points="-11,-5 -8,-9 14,-9 11,-5" fill="#d97b51"/><polygon points="11,-5 14,-9 14,3 11,7" fill="#93472a"/><path d="M-11 -5L-8 -9H14V3L11 7H-11ZM-11 -5H11V7M11 -5L14 -9" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
      <g transform="translate(73 17) rotate(-8)"><polygon points="-11,-5 11,-5 11,7 -11,7" fill="#c4673f"/><polygon points="-11,-5 -8,-9 14,-9 11,-5" fill="#d97b51"/><polygon points="11,-5 14,-9 14,3 11,7" fill="#93472a"/><path d="M-11 -5L-8 -9H14V3L11 7H-11ZM-11 -5H11V7M11 -5L14 -9" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
      <polygon points="14,34 26,39 50,39 50,64 42,64" fill="#fbf6ea"/><polygon points="50,39 74,39 86,34 58,64 50,64" fill="#cdbd9c"/>
      <polygon points="42,64 50,64 50,82 42,82" fill="#e8dcc2"/><polygon points="50,64 58,64 58,82 50,82" fill="#b9a57f"/>
      <polygon points="14,34 26,29 74,29 86,34 74,39 26,39" fill="#232d31"/>
      <path d="M14 34L26 29H74L86 34L58 64V82H42V64ZM14 34L26 39H74L86 34" fill="none" stroke="#131a1d" strokeWidth="3.6"/>
      <g transform="translate(50 90)"><polygon points="-12,-4 12,-4 12,6 -12,6" fill="#c4673f"/><polygon points="-12,-4 -9,-7 15,-7 12,-4" fill="#d97b51"/><polygon points="12,-4 15,-7 15,3 12,6" fill="#93472a"/><path d="M-12 -4L-9 -7H15V3L12 6H-12ZM-12 -4H12V6M12 -4L15 -7" fill="none" stroke="#131a1d" strokeWidth="2.8"/></g>
      <polygon points="76,69 82.4,71.6 85,78 82.4,84.4 76,87 69.6,84.4 67,78 69.6,71.6" fill="#fbf6ea" stroke="#131a1d" strokeWidth="3"/>
      <text x="76" y="82.5" textAnchor="middle" fontFamily="Figtree, sans-serif" fontWeight="900" fontSize="13" fill="#131a1d">2</text>
    </>
  ),
  tradeMonopoly: (
    <>
      <polygon points="34,96 38,87 50,86 50,96" fill="#b07840"/><polygon points="50,86 62,87 66,96 50,96" fill="#855628"/><path d="M34 96L38 87L50 86L62 87L66 96Z" fill="none" stroke="#131a1d"/>
      <polygon points="47.5,24 50,24 50,86 47.5,86" fill="#d39a5c"/><polygon points="50,24 52.5,24 52.5,86 50,86" fill="#855628"/><path d="M47.5 24H52.5V86H47.5Z" fill="none" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="20,30 80,18 80,22 20,34" fill="#b07840" stroke="#131a1d" strokeWidth="3"/>
      <polygon points="50,14 54,16.5 54,21.5 50,24 46,21.5 46,16.5" fill="#c94a33" stroke="#131a1d" strokeWidth="2.8"/>
      <path d="M20 32L10 58M20 32L30 58M80 20L70 44M80 20L90 44" fill="none" stroke="#131a1d" strokeWidth="2.6"/>
      <polygon points="8,58 32,58 28,66 20,68 12,66" fill="#e8dcc2"/><polygon points="8,58 32,58 20,62" fill="#fbf6ea"/><path d="M8 58H32L28 66L20 68L12 66Z" fill="none" stroke="#131a1d"/>
      <g stroke="#131a1d" strokeWidth="2.6"><polygon points="12,54.5 15,52 25,52 28,54.5 25,57 15,57" fill="#a9adb6"/><polygon points="12,50 15,47.5 25,47.5 28,50 25,52.5 15,52.5" fill="#c9ced6"/><polygon points="12,45.5 15,43 25,43 28,45.5 25,48 15,48" fill="#eef1f4"/></g>
      <polygon points="68,44 92,44 88,52 80,54 72,52" fill="#e8dcc2"/><polygon points="68,44 92,44 80,48" fill="#fbf6ea"/><path d="M68 44H92L88 52L80 54L72 52Z" fill="none" stroke="#131a1d"/>
    </>
  ),
};

export type TileTint = 'dev' | Track;

/** The two facet tints of the paper hex tile, per track (the lit and the shaded side). */
const TILE_TINT: Record<TileTint, [string, string]> = {
  dev: ['#eef3f4', '#e2ebed'],
  science: ['#eef5ef', '#e3efe5'],
  politics: ['#eef2fa', '#e2e9f7'],
  trade: ['#f9f4e4', '#f3ebd2'],
};

/**
 * The paper hex tile with its ink drop shadow and a few faint facets in the track's tint; the card's
 * illustration stands on it. `simple` is the version for the small hand sizes: a plain paper hex and
 * a heavier outline, since the facets would only turn to mush there.
 */
export function CardTile({ tint, simple, children, className }: { tint: TileTint; simple?: boolean; children: React.ReactNode; className?: string }) {
  const [a, b] = TILE_TINT[tint];
  return (
    <svg className={className} viewBox="0 0 100 104" aria-hidden preserveAspectRatio="xMidYMid meet">
      {simple ? (
        <>
          <polygon points="50,6 92.4,30.5 92.4,79.5 50,104 7.6,79.5 7.6,30.5" fill={INK} />
          <polygon points="50,1 92.4,25.5 92.4,74.5 50,99 7.6,74.5 7.6,25.5" fill={PAPER} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <polygon points="50,5 92.4,29.5 92.4,78.5 50,103 7.6,78.5 7.6,29.5" fill={INK} />
          <polygon points="50,50 50,1 7.6,25.5" fill={PAPER} />
          <polygon points="50,50 50,1 92.4,25.5" fill={a} />
          <polygon points="50,50 7.6,25.5 7.6,74.5" fill={PAPER} />
          <polygon points="50,50 92.4,25.5 92.4,74.5" fill={b} />
          <polygon points="50,50 7.6,74.5 50,99" fill={a} />
          <polygon points="50,50 92.4,74.5 50,99" fill={b} />
          <polygon points="50,1 92.4,25.5 92.4,74.5 50,99 7.6,74.5 7.6,25.5" fill="none" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        </>
      )}
      <g transform="translate(16 15) scale(0.68)" strokeLinejoin="round" strokeLinecap="round" strokeWidth={simple ? 5.4 : 3.4}>
        {children}
      </g>
    </svg>
  );
}

/** What each track's emblem looks like, inside a 24 x 24 box. */
const EMBLEM: Record<TileTint, React.ReactNode> = {
  dev: <path d="M12 7.2L16.4 9.6V14.4L12 16.8L7.6 14.4V9.6Z" fill={INK} />,
  science: (
    <>
      <circle cx="12" cy="12" r="5.6" fill="none" stroke={INK} strokeWidth="3.2" strokeDasharray="2.2 2.2" />
      <circle cx="12" cy="12" r="4.4" fill={INK} />
      <circle cx="12" cy="12" r="1.7" fill="#e8dcc2" />
    </>
  ),
  politics: <path d="M6.5 16.5L5.5 8.5L9.2 11.8L12 6.5L14.8 11.8L18.5 8.5L17.5 16.5Z" fill={INK} />,
  trade: <path d="M6 9.5H17M14 6.5L17 9.5L14 12.5M18 14.5H7M10 11.5L7 14.5L10 17.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />,
};

/** The small hex index in a card's corner: the track's glyph (hex for development, cog, crown, arrows). */
export function TrackGlyph({ track, className }: { track: TileTint; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 22" aria-hidden>
      <path d="M10 1L19 6V16L10 21L1 16V6Z" fill={PAPER} stroke={INK} strokeWidth="2" />
      {track === 'dev' && <path d="M10 6.5L14 8.8V13.2L10 15.5L6 13.2V8.8Z" fill={INK} />}
      {track === 'science' && (
        <>
          <circle cx="10" cy="11" r="3.6" fill="none" stroke={INK} strokeWidth="2.2" strokeDasharray="1.41 1.41" />
          <circle cx="10" cy="11" r="2.8" fill={INK} />
        </>
      )}
      {track === 'politics' && <path d="M5.8 14.4L5.2 8.6L7.8 10.7L10 7L12.2 10.7L14.8 8.6L14.2 14.4Z" fill={INK} />}
      {track === 'trade' && (
        <path d="M5.5 9H14M12 7L14 9L12 11M14.5 13H6M8 11L6 13L8 15" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export type BackKind = 'dev' | Track;

const BACK_RING: Record<BackKind, string> = { dev: '#1d5a6b', science: '#2f7a3c', politics: '#2c5fb8', trade: '#cfa53c' };
const BACK_LABEL: Record<BackKind, string> = { dev: 'DEVELOPMENT', science: 'SCIENCE', politics: 'POLITICS', trade: 'TRADE' };
/** Face-down colours: the sea-teal of the development deck, or the track's colour. */
export const BACK_BG: Record<BackKind, string> = { dev: '#0f2f3b', science: '#3f9b4f', politics: '#3a74d8', trade: '#e9c35a' };

/**
 * The back of a development or progress card: a ring around a faceted hex (golden for development,
 * paper with the track's emblem for a progress deck) over a name band. `label` is left off at icon size.
 */
export function CardBackArt({ kind, label = true, className }: { kind: BackKind; label?: boolean; className?: string }) {
  const facets =
    kind === 'dev'
      ? ['#ffd66e', '#f6c450', '#f2b33d', '#d99a1f', '#c98a14', '#e0a52a']
      : ['#fbf6ea', '#f1e8d4', '#e8dcc2', '#d9cbab', '#cdbd9c', '#e0d3b6'];
  return (
    <svg className={className} viewBox="0 0 144 204" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g strokeLinejoin="round">
        {/* Its own ground, so no sliver of whatever sits behind shows at the rounded edges. */}
        <rect width="144" height="204" fill={BACK_BG[kind]} />
        <polygon points="72,30 125.7,61 125.7,123 72,154 18.3,123 18.3,61" fill="none" stroke={BACK_RING[kind]} strokeWidth="8" />
        <polygon points="72,54 110.1,76 110.1,120 72,142 33.9,120 33.9,76" fill={INK} />
        <polygon points="72,92 72,48 33.9,70" fill={facets[0]} />
        <polygon points="72,92 33.9,70 33.9,114" fill={facets[1]} />
        <polygon points="72,92 72,48 110.1,70" fill={facets[2]} />
        <polygon points="72,92 110.1,70 110.1,114" fill={facets[3]} />
        <polygon points="72,92 110.1,114 72,136" fill={facets[4]} />
        <polygon points="72,92 72,136 33.9,114" fill={facets[5]} />
        <polygon points="72,48 110.1,70 110.1,114 72,136 33.9,114 33.9,70" fill="none" stroke={INK} strokeWidth="5" />
        {kind === 'dev' ? (
          <polygon points="72,73 88.5,82.5 88.5,101.5 72,111 55.5,101.5 55.5,82.5" fill={INK} />
        ) : (
          <g transform="translate(72 92) scale(2.6) translate(-12 -12)">{EMBLEM[kind]}</g>
        )}
        {/* The name bar only with its name: unlabelled (the small table icons), a bare ink strip met the
            rounded border and let the card's colour fringe through at its corners. */}
        {label && <rect x="0" y="168" width="144" height="36" fill={INK} />}
        {label && (
          <text x="72" y="191" textAnchor="middle" fontFamily="Figtree, sans-serif" fontWeight="900" fontSize={kind === 'dev' ? 12 : 13} letterSpacing={kind === 'dev' ? 2 : 2.5} fill={PAPER}>
            {BACK_LABEL[kind]}
          </text>
        )}
      </g>
    </svg>
  );
}
