import React from "react";

interface CarProps{
    children: React.ReactNode;
    className?: string;

}

export const Card: React.FC<CarProps> = ({children, className = ''}) => {
    return(
        <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
            {children}
        </div>
    );
}

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
 children,
 className = '',

}) => {
    return <h3 className={`font-semibold text-xl ${className}`}>{children}</h3>;
};


export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
 children,
 className = '',

}) => {
    return <h3 className={`font-semibold text-xl ${className}`}>{children}</h3>;
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
 children,
 className = '',

}) => {
    return <div className={`text-gray-700 ${className}`}>{children}</div>;
};

    
