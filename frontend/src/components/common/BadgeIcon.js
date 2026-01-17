import React from 'react';
import { PenTool, Star, Bug, Flame, MessageCircle, CheckCircle, Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BadgeIcon = ({ badgeId, size = "md", showTooltip = true, description = "" }) => {
    const getIcon = () => {
        switch (badgeId) {
            case 'first_post': return <PenTool className={getSizeClass()} />;
            case 'popular_writer': return <Star className={getSizeClass()} />;
            case 'bug_hunter': return <Bug className={getSizeClass()} />;
            case 'streak_master': return <Flame className={getSizeClass()} />;
            case 'helper': return <MessageCircle className={getSizeClass()} />;
            case 'verified': return <CheckCircle className={getSizeClass()} />;
            default: return <Award className={getSizeClass()} />;
        }
    };

    const getSizeClass = () => {
        switch (size) {
            case 'sm': return "h-4 w-4";
            case 'lg': return "h-8 w-8";
            case 'xl': return "h-12 w-12";
            default: return "h-6 w-6";
        }
    };

    const getColorClass = () => {
        switch (badgeId) {
            case 'first_post': return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            case 'popular_writer': return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
            case 'bug_hunter': return "text-red-400 bg-red-400/10 border-red-400/20";
            case 'streak_master': return "text-orange-400 bg-orange-400/10 border-orange-400/20";
            case 'helper': return "text-green-400 bg-green-400/10 border-green-400/20";
            case 'verified': return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
            default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
        }
    };

    const content = (
        <div className={`flex items-center justify-center rounded-full border ${getColorClass()} p-2`}>
            {getIcon()}
        </div>
    );

    if (!showTooltip) return content;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="cursor-help">{content}</div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{description || badgeId}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default BadgeIcon;
