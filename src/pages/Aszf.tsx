import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function Aszf() {
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
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-12 text-stone-900">Általános Szerződési Feltételek</h1>
        
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-200">
          <div className="prose prose-stone max-w-none text-stone-600 text-lg space-y-6">
            <h3 className="text-2xl font-bold text-stone-900">1. Alapvető rendelkezések</h3>
            <p>A jelen Általános Szerződési Feltételek (ÁSZF) Szilágyi Illés Egyéni Vállalkozó (továbbiakban: Szolgáltató) által a zold-mezo.hu weboldalon keresztül nyújtott szolgáltatások igénybevételének feltételeit tartalmazza.</p>
            
            <h3 className="text-2xl font-bold text-stone-900 mt-8">2. Szolgáltató adatai</h3>
            <ul className="list-disc pl-5 space-y-2">
               <li><strong className="text-stone-900">Név:</strong> Szilágyi Illés Egyéni Vállalkozó</li>
               <li><strong className="text-stone-900">Székhely:</strong> 2162 Őrbottyán, Kvassay Telep 4C</li>
               <li><strong className="text-stone-900">Adószám:</strong> 55393964-1-33</li>
               <li><strong className="text-stone-900">Nyilvántartási szám:</strong> 54065707</li>
               <li><strong className="text-stone-900">Email:</strong> <a href="mailto:info@zold-mezo.hu" className="hover:text-emerald-600 transition-colors">info@zold-mezo.hu</a></li>
               <li><strong className="text-stone-900">Telefonszám:</strong> <a href="tel:+36202090955" className="hover:text-emerald-600 transition-colors">+36 20 20 90 955</a></li>
            </ul>

            <h3 className="text-2xl font-bold text-stone-900 mt-8">3. Ajánlatkérés és a szolgáltatás megrendelése</h3>
            <p>A weboldalon található "Árkalkulátor és Árajánlatkérő" űrlap kitöltése és elküldése nem minősül kötelező érvényű megrendelésnek, csupán ajánlatkérésnek. A weboldalon kalkulált árak tájékoztató jellegűek.</p>
            <p>A végleges árajánlatot a Szolgáltató minden esetben előzetes helyszíni felmérés, vagy rendszeres egyeztetés után adja meg az Ügyfélnek. A szerződés a felek közötti egyedi megállapodás (akár szóbeli, akár írásbeli) alapján, a végleges árajánlat elfogadásával jön létre.</p>

            <h3 className="text-2xl font-bold text-stone-900 mt-8">4. Fizetési és teljesítési feltételek</h3>
            <p>A szolgáltatás díjának kiegyenlítése a munkavégzés befejezésekor a helyszínen, vagy a felek által előre egyeztetett egyedi feltételek szerint (pl. átutalás) történik. A Szolgáltató az elvégzett munkáról minden esetben számlát, illetve nyugtát állít ki.</p>
            
            <h3 className="text-2xl font-bold text-stone-900 mt-8">5. Felelősség</h3>
            <p>A Szolgáltató vállalja, hogy a megrendelt zöldterület-kezelési munkákat a legnagyobb gondossággal és szakértelemmel, az előre egyeztetett határidőkre - az időjárási viszonyok függvényében - elvégzi. Vis maior (extrém időjárás stb.) esetén a felek új teljesítési határidőben állapodnak meg.</p>
          </div>
        </div>
      </main>

      <footer className="bg-stone-950 py-8 border-t border-stone-900 text-stone-400 text-center mt-auto">
        &copy; {new Date().getFullYear()} ZÖLDMEZŐ - Minden jog fenntartva.
      </footer>
    </div>
  );
}
