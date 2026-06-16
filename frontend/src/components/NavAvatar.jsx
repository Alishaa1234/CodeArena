import { useState } from "react";

export default function NavAvatar({ user }) {
    const [error, setError] = useState(false);

    if (user?.avatarUrl && !error) {
        return (
            <img
                src={user.avatarUrl}
                alt="Avatar"
                onError={() => setError(true)}
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            />
        );
    }
    return <>{user?.firstName?.[0]?.toUpperCase() || "?"}</>;
}
