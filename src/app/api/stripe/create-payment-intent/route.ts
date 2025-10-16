import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set. Add it to your .env.local file.");
}

const stripe = new Stripe(stripeSecretKey);

type CreatePaymentIntentPayload = {
    amount: number;
    currency?: string;
    receiptEmail?: string;
    description?: string;
};

export async function POST(request: Request) {
    let payload: CreatePaymentIntentPayload | undefined;

    try {
        payload = await request.json();
    } catch (error) {
        console.error("Failed to parse JSON payload", error);
        return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (!payload || typeof payload.amount !== "number" || Number.isNaN(payload.amount)) {
        return NextResponse.json(
            { error: "A valid amount (in the smallest currency unit) is required to create a payment intent." },
            { status: 400 },
        );
    }

    if (payload.amount < 50) {
        return NextResponse.json(
            { error: "Amount must be at least 50 (e.g. $0.50 USD) when using Stripe test mode." },
            { status: 400 },
        );
    }

    const currency = payload.currency?.toLowerCase() || "usd";

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(payload.amount),
            currency,
            description: payload.description ?? "Demo payment via RnD Admin",
            receipt_email: payload.receiptEmail,
            metadata: {
                environment: "demo",
                origin: "rnd-admin",
            },
            automatic_payment_methods: { enabled: true },
        });

        if (!paymentIntent.client_secret) {
            console.error("Stripe returned a payment intent without a client secret", paymentIntent.id);
            return NextResponse.json({ error: "Stripe did not return a client secret." }, { status: 500 });
        }

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("Stripe payment intent creation failed", error);
        if (error instanceof Stripe.errors.StripeError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 400 });
        }

        return NextResponse.json({ error: "Unable to create payment intent." }, { status: 500 });
    }
}
