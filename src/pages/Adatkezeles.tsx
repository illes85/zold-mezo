import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function Adatkezeles() {
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
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-12 text-stone-900">Adatkezelési Tájékoztató</h1>
        
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-200">
          <div className="prose prose-stone max-w-none text-stone-600 text-lg space-y-6">
            <h3 className="text-2xl font-bold text-stone-900">1. Az Adatkezelő adatai</h3>
            <ul className="list-disc pl-5 space-y-2">
               <li><strong className="text-stone-900">Név:</strong> Szilágyi Illés Egyéni Vállalkozó</li>
               <li><strong className="text-stone-900">Székhely:</strong> 2162 Őrbottyán, Kvassay Telep 4C</li>
               <li><strong className="text-stone-900">Email:</strong> <a href="mailto:info@zold-mezo.hu" className="hover:text-emerald-600 transition-colors">info@zold-mezo.hu</a></li>
               <li><strong className="text-stone-900">Telefonszám:</strong> <a href="tel:+36202090955" className="hover:text-emerald-600 transition-colors">+36 20 20 90 955</a></li>
            </ul>

            <h3 className="text-2xl font-bold text-stone-900 mt-8">2. Az adatkezelés célja és jogalapja</h3>
            <p>A zold-mezo.hu weboldalon található kapcsolatfelvételi és árajánlatkérő űrlap kitöltésével Ön személyes adatokat (Név, Telefonszám, valamint az üzenetben megadott egyéb személyes adatokat) ad meg. Az adatkezelés célja az Ön által kért árajánlat elkészítése, kapcsolatfelvétel és az ehhez kapcsolódó kommunikáció.</p>
            <p><strong className="text-stone-900">Jogalap:</strong> Az Ön önkéntes hozzájárulása (GDPR 6. cikk (1) bekezdés a) pont), illetve a szerződés megkötését megelőző lépések megtétele (GDPR 6. cikk (1) bekezdés b) pont).</p>

            <h3 className="text-2xl font-bold text-stone-900 mt-8">3. A kezelt adatok köre</h3>
            <p>Kezelt adatok: Név (vagy cégnév), telefonszám, a szolgáltatás helyszíne és az üzenetben megadott egyedi információk.</p>

            <h3 className="text-2xl font-bold text-stone-900 mt-8">4. Az adatkezelés időtartama</h3>
            <p>A megadott adatokat az árajánlatadási folyamat lezárásáig, illetve megrendelés esetén a számviteli kötelezettségek teljesítéséig (jogszabály által előírt 8 év) kezeljük. Amennyiben ajánlatkérése nem vezet megrendeléshez, adatait a hozzájárulás visszavonásáig vagy elévülési időn belül (alapesetben 5 év) őrizzük meg a jogi igények érvényesítése céljából.</p>

            <h3 className="text-2xl font-bold text-stone-900 mt-8">5. Érintetti jogok</h3>
            <p>Ön jogosult tájékoztatást kérni személyes adatai kezeléséről, kérheti azok helyesbítését, törlését, vagy kezelésének korlátozását. Kérését az Adatkezelő fenti elérhetőségein jelezheti.</p>
            <p>Jogorvoslati lehetőséggel, panasszal a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH) lehet élni (1055 Budapest, Falk Miksa utca 9-11., ugyfelszolgalat@naih.hu).</p>
          </div>
        </div>
      </main>

      <footer className="bg-stone-950 py-8 border-t border-stone-900 text-stone-400 text-center mt-auto">
        &copy; {new Date().getFullYear()} ZÖLDMEZŐ - Minden jog fenntartva.
      </footer>
    </div>
  );
}
