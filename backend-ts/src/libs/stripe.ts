import Stripe from "stripe";

//Get environment variable for stripe
const stripeKey = process.env.STRIPE_SECRET_KEY!;

//Create the stipe client with the variables
export const stripe = new Stripe(stripeKey, {
	apiVersion: "2023-10-16",
});
