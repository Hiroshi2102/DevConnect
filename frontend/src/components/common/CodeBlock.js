import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CodeBlock = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-lg overflow-hidden my-4 border border-gray-800">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-gray-800/80 hover:bg-gray-700 text-gray-300"
                    onClick={handleCopy}
                >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            <SyntaxHighlighter
                language={language} // If undefined, it will auto-detect
                style={atomOneDark}
                customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    backgroundColor: '#282c34', // Atom One Dark background
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    borderRadius: '0.5rem',
                }}
                showLineNumbers={true}
                wrapLines={true}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeBlock;
