"use client";

import {useEffect} from "react";

const Page = () => {
    useEffect(() => {
        window.location.href = "https://playground-one-peach.vercel.app/";
    }, []);
    return (
        <div className="min-h-screen">
            <p className="h-full font-Poppins">Redirecting to the playground...</p>
        </div>
    );
};

export default Page;
