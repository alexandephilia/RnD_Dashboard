"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { RiErrorWarningLine, RiInformationLine, RiLoader4Line, RiRefreshLine, RiShieldStarLine } from "@remixicon/react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
    throw new Error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured. Add it to your .env.local file before using the payment demo.",
    );
}

const stripePromise = loadStripe(publishableKey);

const DEFAULT_AMOUNT_CENTS = 4900;

export default function PaymentDemoPage() {
    const [amountInput, setAmountInput] = useState("49.00");
    const [amountCents, setAmountCents] = useState(DEFAULT_AMOUNT_CENTS);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoadingIntent, setIsLoadingIntent] = useState(false);
    const [intentError, setIntentError] = useState<string | null>(null);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
    const [lastPaymentError, setLastPaymentError] = useState<string | null>(null);

    const parseAmountInput = useCallback((value: string) => {
        const normalized = value.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
        const parsed = Number.parseFloat(normalized);
        if (!Number.isFinite(parsed)) {
            return NaN;
        }
        return Math.round(parsed * 100);
    }, []);

    const createPaymentIntent = useCallback(
        async (targetAmount: number) => {
            setIsLoadingIntent(true);
            setIntentError(null);
            setClientSecret(null);
            setPaymentIntentId(null);
            setLastPaymentError(null);

            try {
                const response = await fetch("/api/stripe/create-payment-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: targetAmount, currency: "usd" }),
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.error || "Unable to create payment intent.");
                }

                const data = (await response.json()) as { clientSecret: string };
                if (!data.clientSecret) {
                    throw new Error("Stripe did not return a client secret.");
                }

                setClientSecret(data.clientSecret);
                setAmountCents(targetAmount);
            } catch (error) {
                console.error("Create payment intent failed", error);
                setIntentError(error instanceof Error ? error.message : "Failed to initialise payment intent.");
            } finally {
                setIsLoadingIntent(false);
            }
        },
        []);

    useEffect(() => {
        createPaymentIntent(DEFAULT_AMOUNT_CENTS);
    }, [createPaymentIntent]);

    const elementsOptions = useMemo(() => {
        if (!clientSecret) return undefined;
        return {
            clientSecret,
            appearance: {
                theme: "night" as const,
                variables: {
                    colorPrimary: "#facc15",
                    colorBackground: "#050505",
                    colorText: "#f8fafc",
                    colorDanger: "#f87171",
                    spacingUnit: "6px",
                    borderRadius: "12px",
                },
            },
        } satisfies Parameters<typeof Elements>[0]["options"];
    }, [clientSecret]);

    const handleAmountUpdate = async () => {
        const cents = parseAmountInput(amountInput);
        if (!Number.isFinite(cents) || cents < 50) {
            setIntentError("Enter an amount of at least $0.50");
            return;
        }
        await createPaymentIntent(cents);
    };

    return (
        <div className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_55%)] py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-10">
                    <div className="space-y-3 text-center">
                        <Badge className="self-center w-fit bg-yellow-500/15 text-yellow-400 border border-yellow-500/40">
                            Demo • Stripe Test Mode
                        </Badge>
                        <h1 className="text-4xl font-semibold tracking-tight">Stripe Payment Sandbox</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Experiment with a fully integrated Stripe Elements checkout experience. Use Stripe test cards to
                            simulate a complete payment flow without charging real cards.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <Card className="border border-yellow-500/20 bg-background/40 backdrop-blur">
                            <CardHeader className="space-y-1">
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <RiShieldStarLine className="size-6 text-yellow-500" aria-hidden="true" />
                                    Secure test checkout
                                </CardTitle>
                                <CardDescription>
                                    Adjust the amount, enter a Stripe test card, and finalise a secure demo transaction.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount (USD)</Label>
                                        <Input
                                            id="amount"
                                            inputMode="decimal"
                                            value={amountInput}
                                            onChange={(event) => setAmountInput(event.target.value)}
                                            disabled={isLoadingIntent}
                                            className="bg-background/60"
                                            aria-describedby="amount-help"
                                        />
                                        <p id="amount-help" className="text-xs text-muted-foreground">
                                            Minimum $0.50 • Use the Update button to refresh the payment intent.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleAmountUpdate}
                                        disabled={isLoadingIntent}
                                        className="flex items-center gap-2"
                                    >
                                        {isLoadingIntent ? (
                                            <>
                                                <RiLoader4Line className="size-4 animate-spin" aria-hidden="true" />
                                                Refreshing
                                            </>
                                        ) : (
                                            <>
                                                <RiRefreshLine className="size-4" aria-hidden="true" />
                                                Update
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground space-y-2">
                                    <div className="flex items-start gap-3">
                                        <RiInformationLine className="size-5 text-foreground/70 mt-0.5" aria-hidden="true" />
                                        <div>
                                            <p className="font-medium text-foreground/90">Stripe test cards</p>
                                            <p className="mt-1">
                                                Try <span className="font-semibold text-foreground">4242 4242 4242 4242</span> with any
                                                future expiry, CVC and ZIP. Payments stay in your Stripe test dashboard.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {intentError && (
                                    <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-500">
                                        <RiErrorWarningLine className="size-5 mt-0.5" aria-hidden="true" />
                                        <p className="text-sm">{intentError}</p>
                                    </div>
                                )}

                                {elementsOptions ? (
                                    <Elements stripe={stripePromise} options={elementsOptions} key={clientSecret}>
                                        <StripePaymentForm
                                            amount={amountCents}
                                            onSuccess={(intentId) => {
                                                setPaymentIntentId(intentId);
                                                setLastPaymentError(null);
                                            }}
                                            onError={(error) => {
                                                setLastPaymentError(error);
                                            }}
                                        />
                                    </Elements>
                                ) : (
                                    <div className="grid place-items-center rounded-xl border border-dashed border-border/50 py-14 text-center text-sm text-muted-foreground">
                                        Preparing secure Stripe Elements checkout…
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-border/60 bg-background/30 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="text-xl">Live status</CardTitle>
                                <CardDescription>Track payment confirmation and demo environment details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
                                    <p className="text-sm text-muted-foreground">Payment intent</p>
                                    <p className="mt-1 font-medium break-words">
                                        {clientSecret ? clientSecret.split("_secret")[0] : "—"}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        An intent is regenerated whenever you update the amount. All operations stay in Stripe test mode.
                                    </p>
                                </div>

                                <div className="rounded-lg border border-muted/40 bg-muted/10 p-4 space-y-2">
                                    <p className="text-sm text-muted-foreground">Latest result</p>
                                    {paymentIntentId ? (
                                        <div className="space-y-1">
                                            <p className="font-medium text-green-400">Payment succeeded</p>
                                            <p className="text-sm text-muted-foreground break-words">Intent ID: {paymentIntentId}</p>
                                        </div>
                                    ) : lastPaymentError ? (
                                        <div className="space-y-1">
                                            <p className="font-medium text-red-400">Payment failed</p>
                                            <p className="text-sm text-muted-foreground">{lastPaymentError}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Complete the form to see live updates.</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-muted/40 bg-muted/5 p-4 text-sm text-muted-foreground space-y-2">
                                    <p className="font-semibold text-foreground">Test-mode safeguards</p>
                                    <ul className="list-disc ps-5 space-y-1">
                                        <li>Use only Stripe-issued test API keys.</li>
                                        <li>No real cards are charged — transactions stay in the Test data tab.</li>
                                        <li>Reset the amount to explore different payment scenarios.</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
