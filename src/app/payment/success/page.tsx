import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiCheckDoubleLine } from "@remixicon/react";

type SuccessPageProps = {
    searchParams: {
        payment_intent?: string;
        redirect_status?: string;
    };
};

export default function PaymentSuccessPage({ searchParams }: SuccessPageProps) {
    const paymentIntent = searchParams.payment_intent;
    const redirectStatus = searchParams.redirect_status;

    return (
        <div className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_55%)] py-16">
            <div className="max-w-xl mx-auto px-4">
                <Card className="border border-green-500/30 bg-background/40 backdrop-blur">
                    <CardHeader className="space-y-2 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-500/20">
                            <RiCheckDoubleLine className="size-8 text-green-400" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-3xl">Payment complete</CardTitle>
                        <CardDescription>
                            You have returned from Stripe. The transaction stayed in test mode for safe experimentation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
                        {paymentIntent ? (
                            <p>
                                Payment Intent ID: <span className="font-mono text-foreground">{paymentIntent}</span>
                            </p>
                        ) : (
                            <p>We could not detect a payment intent reference.</p>
                        )}
                        {redirectStatus && <p>Stripe redirect status: {redirectStatus}</p>}
                        <Button asChild size="lg" className="mt-6">
                            <Link href="/payment">Run another demo</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
