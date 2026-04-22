import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function Impresszum() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-emerald-500 selection:text-white flex flex-col">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-stone-600 hover:text-emerald-600 transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            Vissza a főoldalra
          </Link>
          <Link to="/">
            <img src="/logo.png" alt="ZÖLDMEZŐ Logo" className="h-12 w-auto object-contain" />
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-grow w-full">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-12 text-stone-900">Impresszum</h1>
        
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-200 mb-12">
          <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">1</span>
            Szolgáltató adatai
          </h2>
          <div className="space-y-4 text-stone-600 text-lg">
            <p><strong className="text-stone-900 font-semibold">Név:</strong> Szilágyi Illés Egyéni Vállalkozó</p>
            <p><strong className="text-stone-900 font-semibold">Székhely:</strong> 2162 Őrbottyán, Kvassay Telep 4C</p>
            <p><strong className="text-stone-900 font-semibold">Adószám:</strong> 55393964-1-33</p>
            <p><strong className="text-stone-900 font-semibold">Nyilvántartási szám:</strong> 54065707</p>
            <p><strong className="text-stone-900 font-semibold">E-mail:</strong> <a href="mailto:info@zold-mezo.hu" className="text-emerald-600 hover:underline">info@zold-mezo.hu</a></p>
            <p><strong className="text-stone-900 font-semibold">Telefonszám:</strong> <a href="tel:+36202090955" className="text-emerald-600 hover:underline">+36 20 20 90 955</a></p>
          </div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">2</span>
            Tárhelyszolgáltató adatai
          </h2>
          <div className="space-y-4 text-stone-600 text-lg">
            <p><strong className="text-stone-900 font-semibold">Cégnév:</strong> Nethely Kft.</p>
            <p><strong className="text-stone-900 font-semibold">Székhely:</strong> 1115 Budapest, Halmi utca 29.</p>
            <p><strong className="text-stone-900 font-semibold">Adószám:</strong> 23358005-2-43</p>
            <p><strong className="text-stone-900 font-semibold">Cégjegyzékszám:</strong> 01-09-961790</p>
            <p><strong className="text-stone-900 font-semibold">Ügyfélszolgálat:</strong> munkanapokon 8:30 - 17:00</p>
            <p><strong className="text-stone-900 font-semibold">E-mail:</strong> <a href="mailto:info@nethely.hu" className="text-emerald-600 hover:underline">info@nethely.hu</a></p>
            <p><strong className="text-stone-900 font-semibold">Telefonszám:</strong> <a href="tel:+3618001500" className="text-emerald-600 hover:underline">+36 1 800 1500</a></p>
          </div>
        </div>
      </main>

      <footer className="bg-stone-950 py-8 border-t border-stone-900 text-stone-400 text-center mt-auto">
        &copy; {new Date().getFullYear()} ZÖLDMEZŐ - Minden jog fenntartva.
      </footer>
    </div>
  );
}
