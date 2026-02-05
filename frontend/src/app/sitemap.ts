import { MetadataRoute } from "next";

//Gives importance to different pages
export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://pingelo.vercel.app";

    return [
        {
            url: `${baseUrl}/`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/leaderboard`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/matches`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/groups`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.6,
        },
        {
            url: `${baseUrl}/matches/submit`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/signin`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.4,
        },
        {
            url: `${baseUrl}/signup`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.4,
        },
    ];
}
