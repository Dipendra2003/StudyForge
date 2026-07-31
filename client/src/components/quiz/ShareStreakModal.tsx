import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Share2, Flame } from "lucide-react";

interface ShareStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
}

export function ShareStreakModal({
  isOpen,
  onClose,
  streak,
}: ShareStreakModalProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `🔥 I'm on a ${streak}-day streak on StudyForge's Quiz of the Day! Can you beat my score?\n\nJoin me at StudyForge!`;
  const shareUrl = `${window.location.origin}/quiz-mode`;

  const handleCopyLink = async () => {
    const fullText = `${shareText}\n${shareUrl}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StudyForge Quiz of the Day",
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share or share not supported - silently ignore
      }
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(
      shareText + "\n" + shareUrl
    )}`;
    window.open(url, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
            className="fixed left-1/2 top-1/2 w-[90vw] max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header / Graphic */}
            <div className="relative h-40 bg-gradient-to-br from-orange-400 to-red-500 flex flex-col items-center justify-center p-6 text-white text-center">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
              
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-3 shadow-lg"
              >
                <Flame className="w-10 h-10 text-white fill-white/20" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight">
                {streak}-Day Streak!
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 relative border border-gray-100 dark:border-gray-800">
                <p className="whitespace-pre-wrap font-medium">{shareText}</p>
                <p className="text-blue-500 mt-2 truncate">{shareUrl}</p>
              </div>

              {/* Share Options */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={shareToTwitter}
                    className="flex flex-col items-center justify-center gap-2 py-3 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-xl transition-colors font-medium"
                  >
                    <i className="fa-brands fa-twitter text-xl"></i>
                    <span className="text-sm">Twitter</span>
                  </button>
                  <button
                    onClick={shareToWhatsApp}
                    className="flex flex-col items-center justify-center gap-2 py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl transition-colors font-medium"
                  >
                    <i className="fa-brands fa-whatsapp text-xl"></i>
                    <span className="text-sm">WhatsApp</span>
                  </button>
                </div>

                {typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-colors font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    Share via...
                  </button>
                )}

                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy text
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
