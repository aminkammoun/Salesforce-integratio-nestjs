export async function handleQuery(query: string,
    body: any
) {
    const res = await fetch(process.env.ISTANCEURL + query, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.BEARERTOKEN,
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });

    try {
        const json = await res.json();
        if (json.errors.length > 0) {
            // eslint-disable-next-line no-console
            console.error(json.errors);
            console.error("Failed to fetch API");
        }
        return json.data;
    } catch (err) {
        console.error(err);
    }
    return null;
}

