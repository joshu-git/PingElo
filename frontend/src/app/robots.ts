import { MetadataRoute } from "next";

//Tells scrapers what they can scrape
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api",
                "/profile",
                "/claim",
            ],
        },
        sitemap: "https://pingelo.vercel.app/sitemap.xml",
    };
}