import { useState } from "react";
import { OTPInput } from "./OTPInput";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

/**
 * Example component demonstrating OTPInput usage
 * This can be used as a reference for implementing OTP verification in auth pages
 */
export default function OTPInputExample() {
  const [otp, setOtp] = useState("");
  const [submittedOtp, setSubmittedOtp] = useState("");

  const handleComplete = (value: string) => {
    setSubmittedOtp(value);
  };

  const handleChange = (value: string) => {
    setOtp(value);
  };

  const handleManualSubmit = () => {
    if (otp.length === 6) {
      setSubmittedOtp(otp);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>OTP Input Example</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Example 1: Auto-submit on complete */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Auto-submit (default)</h3>
            <OTPInput
              length={6}
              onComplete={handleComplete}
              onChange={handleChange}
              autoSubmit={true}
            />
            <p className="text-xs text-muted-foreground">
              Automatically submits when all 6 digits are entered
            </p>
          </div>

          {/* Example 2: Manual submit */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Manual submit</h3>
            <OTPInput
              length={6}
              onChange={handleChange}
              autoSubmit={false}
            />
            <Button 
              onClick={handleManualSubmit} 
              disabled={otp.length !== 6}
              className="w-full"
            >
              Verify Code
            </Button>
            <p className="text-xs text-muted-foreground">
              Requires manual button click to submit
            </p>
          </div>

          {/* Display current OTP value */}
          <div className="p-4 bg-muted rounded-md space-y-2">
            <p className="text-sm">
              <span className="font-medium">Current OTP:</span>{" "}
              <span className="font-mono">{otp || "---"}</span>
            </p>
            {submittedOtp && (
              <p className="text-sm text-green-600 dark:text-green-400">
                <span className="font-medium">Submitted:</span>{" "}
                <span className="font-mono">{submittedOtp}</span>
              </p>
            )}
          </div>

          {/* Usage tips */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Features:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Auto-focus on first input</li>
              <li>Auto-advance to next field</li>
              <li>Backspace to previous field</li>
              <li>Arrow key navigation</li>
              <li>Paste support (try copying: 123456)</li>
              <li>Only accepts numeric input</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
