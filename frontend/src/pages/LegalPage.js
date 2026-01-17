import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const LegalPage = ({ title, content }) => {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
            <Navbar />
            <div className="flex-grow max-w-4xl mx-auto px-4 py-12 w-full">
                <h1 className="text-3xl font-bold text-white mb-8">{title}</h1>
                <div className="prose prose-invert max-w-none text-gray-300">
                    {content || <p>Content coming soon...</p>}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LegalPage;
