import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedAreaPixels: any) => void;
}

export default function ImageCropperModal({ isOpen, imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [naturalAspect, setNaturalAspect] = useState<number>(16 / 9);

  const handleCropComplete = useCallback((croppedArea: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const onMediaLoaded = useCallback((mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
    if (mediaSize.naturalHeight && mediaSize.naturalWidth) {
      setNaturalAspect(mediaSize.naturalWidth / mediaSize.naturalHeight);
    }
  }, []);

  const parseAspect = (ratioStr: string) => {
    const parts = ratioStr.split(':');
    if (parts.length === 2) {
      return Number(parts[0]) / Number(parts[1]);
    }
    return 16 / 9;
  };

  const handleSave = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-4 border-b border-stone-200">
            <h2 className="text-xl font-bold text-stone-800">Kép megvágása és beállítása</h2>
            <button onClick={onClose} className="p-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative w-full h-[50vh] bg-stone-900">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio === 'szabad' ? undefined : (aspectRatio === 'eredeti' ? naturalAspect : parseAspect(aspectRatio))}
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
              onMediaLoaded={onMediaLoaded}
            />
          </div>
          
          <div className="p-6 border-t border-stone-200 bg-stone-50">
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">Képarány</label>
              <div className="flex gap-2 flex-wrap mb-4">
                {[
                  { value: '16:9', label: '16:9 (Fejléc/Széles)' },
                  { value: '4:3', label: '4:3' },
                  { value: '1:1', label: '1:1 (Négyzet)' },
                  { value: 'eredeti', label: 'Eredeti arány' },
                  { value: 'szabad', label: 'Szabad' }
                ].map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      aspectRatio === ratio.value 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">Nagyítás</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-stone-600 font-medium hover:bg-stone-200 rounded-xl transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-emerald-600 text-white font-medium hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Check className="w-5 h-5" />
                Kép mentése
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
