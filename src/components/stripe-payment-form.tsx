"use client";

import { useMemo, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { RiCheckLine, RiCloseLine, RiLoader4Line } from "@remixicon/react";

type PaymentFormProps = {
    amount: number;
    onSuccess?: (paymentIntentId: string) => void;
    onError?: (error: string) => void;
};

export function StripePaymentForm({ amount, onSuccess, onError }: PaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const formattedAmount = useMemo(
        () =>
            new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
            }).format(amount / 100),
        [amount],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const { error: submitError } = await elements.submit();
            if (submitError) {
                setErrorMessage(submitError.message || "Payment element validation failed.");
                setIsProcessing(false);
                onError?.(submitError.message || "Payment element validation failed.");
                return;
            }

            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + "/payment/success",
                },
                redirect: "if_required",
            });

            if (error) {
                setErrorMessage(error.message || "Payment failed.");
                setIsProcessing(false);
                onError?.(error.message || "Payment failed.");
                return;
            }

            if (paymentIntent && paymentIntent.status === "succeeded") {
                setSuccessMessage(`Payment successful! Transaction ID: ${paymentIntent.id}`);
                onSuccess?.(paymentIntent.id);
            } else if (paymentIntent && paymentIntent.status === "processing") {
                setSuccessMessage("Payment is processing. You will be notified when it completes.");
                onSuccess?.(paymentIntent.id);
            } else {
                setErrorMessage("Payment status unknown. Please check with support.");
                onError?.("Payment status unknown.");
            }
        } catch (err) {
            console.error("Payment error", err);
            setErrorMessage("An unexpected error occurred. Please try again.");
            onError?.("An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />

            {errorMessage && (
                <div
                    className="flex items-start gap-3 p-4 rounded-lg border border-red-600/30 bg-red-600/10 text-red-600"
                    role="alert"
                >
                    <RiCloseLine className="size-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm flex-1">{errorMessage}</p>
                </div>
            )}

            {successMessage && (
                <div
                    className="flex items-start gap-3 p-4 rounded-lg border border-green-600/30 bg-green-600/10 text-green-600"
                    role="status"
                >
                    <RiCheckLine className="size-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm flex-1">{successMessage}</p>
                </div>
            )}

            <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{formattedAmount}</span>
                </p>
                <Button
                    type="submit"
                    disabled={!stripe || isProcessing || !!successMessage}
                    className="min-w-[160px]"
                >
                    {isProcessing ? (
                        <>
                            <RiLoader4Line className="animate-spin size-4" aria-hidden="true" />
                            <span>Processing...</span>
                        </>
                    ) : successMessage ? (
                        <>
                            <RiCheckLine className="size-4" aria-hidden="true" />
                            <span>Paid</span>
                        </>
                    ) : (
                        <span className="font-medium">{`Pay ${formattedAmount}`}</span>
                    )}
                </Button>
            </div>
        </form>
    );
}
