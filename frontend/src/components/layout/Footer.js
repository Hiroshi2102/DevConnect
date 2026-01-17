import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-[#0a0a0a] border-t border-gray-800 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h3 className="text-white font-bold mb-4">DevConnect</h3>
                        <p className="text-gray-400 text-sm">
                            Connecting developers, building dreams.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/help" className="hover:text-primary">Help Center</Link></li>
                            <li><Link to="/contact" className="hover:text-primary">Contact Us</Link></li>
                            <li><Link to="/support" className="hover:text-primary">Support</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Social</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-primary">Twitter</a></li>
                            <li><a href="#" className="hover:text-primary">GitHub</a></li>
                            <li><a href="#" className="hover:text-primary">LinkedIn</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} DevConnect. All rights reserved.
                    </p>
                    <p className="text-gray-500 text-sm mt-4 md:mt-0">
                        Created by <span className="text-primary font-semibold">Nishant</span>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
