import * as React from "react";
import { cn } from "@/lib/utils";

export interface OTPInputProps {
  /** Number of OTP digits (default: 6) */
  length?: number;
  /** Callback when OTP is complete */
  onComplete?: (otp: string) => void;
  /** Callback on OTP change */
  onChange?: (otp: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Whether to auto-submit when complete */
  autoSubmit?: boolean;
}

export const OTPInput = React.forwardRef<HTMLDivElement, OTPInputProps>(
  (
    {
      length = 6,
      onComplete,
      onChange,
      disabled = false,
      className,
      autoSubmit = true,
    },
    ref
  ) => {
    const [otp, setOtp] = React.useState<string[]>(Array(length).fill(""));
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Handle input change
    const handleChange = (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/[^0-9]/g, "");
      
      if (digit.length > 1) {
        // Handle paste of multiple digits
        handlePaste(digit, index);
        return;
      }

      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Call onChange callback
      const otpString = newOtp.join("");
      onChange?.(otpString);

      // Auto-focus next input
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if OTP is complete
      if (newOtp.every((d) => d !== "") && autoSubmit) {
        onComplete?.(newOtp.join(""));
      }
    };

    // Handle backspace
    const handleKeyDown = (
      index: number,
      e: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        
        const newOtp = [...otp];
        
        if (otp[index]) {
          // Clear current field
          newOtp[index] = "";
          setOtp(newOtp);
          onChange?.(newOtp.join(""));
        } else if (index > 0) {
          // Move to previous field and clear it
          newOtp[index - 1] = "";
          setOtp(newOtp);
          onChange?.(newOtp.join(""));
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    };

    // Handle paste
    const handlePaste = (pastedData: string, startIndex: number = 0) => {
      const digits = pastedData.replace(/[^0-9]/g, "").split("");
      const newOtp = [...otp];

      digits.forEach((digit, i) => {
        const index = startIndex + i;
        if (index < length) {
          newOtp[index] = digit;
        }
      });

      setOtp(newOtp);
      onChange?.(newOtp.join(""));

      // Focus the next empty field or the last field
      const nextEmptyIndex = newOtp.findIndex((d) => d === "");
      const focusIndex =
        nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(startIndex + digits.length, length - 1);
      inputRefs.current[focusIndex]?.focus();

      // Check if OTP is complete after paste
      if (newOtp.every((d) => d !== "") && autoSubmit) {
        onComplete?.(newOtp.join(""));
      }
    };

    // Handle paste event
    const handlePasteEvent = (
      index: number,
      e: React.ClipboardEvent<HTMLInputElement>
    ) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text");
      handlePaste(pastedData, index);
    };

    // Handle focus - select all text
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    // Auto-focus first input on mount
    React.useEffect(() => {
      inputRefs.current[0]?.focus();
    }, []);

    return (
      <div ref={ref} className={cn("flex gap-2 justify-center", className)}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePasteEvent(index, e)}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              "h-12 w-12 text-center text-lg font-semibold",
              "rounded-md border border-input bg-background",
              "ring-offset-background transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              digit && "border-primary"
            )}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
    );
  }
);

OTPInput.displayName = "OTPInput";
