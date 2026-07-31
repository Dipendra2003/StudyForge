import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Share2, Link as LinkIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface ShareQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizAttemptId: number;
  score: number;
  totalQuestions: number;
}

export function ShareQuizModal({
  isOpen,
  onClose,
  quizAttemptId,
  score,
  totalQuestions,
}: ShareQuizModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/quiz/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quizAttemptId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate shareable link");
      }

      const data = await response.json();
      return data.data;
    },
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    },
  });

  const handleGenerateLink = () => {
    generateLinkMutation.mutate();
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (shareUrl && navigator.share) {
      try {
        await navigator.share({
          title: "Challenge me on this quiz!",
          text: `I scored ${score}/${totalQuestions} on this quiz. Can you beat my score?`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share or share not supported - silently ignore
      }
    }
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
            className="fixed left-1/2 top-1/2 w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Share Quiz
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Challenge your friends to beat your score of{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {score > totalQuestions ? `${score}%` : `${score}/${totalQuestions}`}
                </span>
                !
              </p>

              {!shareUrl ? (
                <button
                  onClick={handleGenerateLink}
                  disabled={generateLinkMutation.isPending}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <LinkIcon className="w-5 h-5" />
                  {generateLinkMutation.isPending
                    ? "Generating Link..."
                    : "Generate Shareable Link"}
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Link Display */}
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg break-all text-sm text-gray-700 dark:text-gray-300">
                    {shareUrl}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>

                    {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                      <button
                        onClick={handleShare}
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    )}
                  </div>
                </div>
              )}

              {generateLinkMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Failed to generate link. Please try again.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
