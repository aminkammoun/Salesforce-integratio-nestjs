export async function handleInsertQuery(query: string,
    object: string,
    body: any
) {
    const res = await fetch(process.env.ISTANCEURL + query + object, {
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
        console.log('handleQuery Result:', json);
        return json.data;
    } catch (err) {
        console.error(err);
    }
    return null;
}
export async function handleQuery(version: string, query: string) {
    console.log(process.env.ISTANCEURL + version + query)
    const res = await fetch(process.env.ISTANCEURL + version + query, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.BEARERTOKEN,
        },
        cache: "no-store",
    }
    );
    console.log('Fetch Result:', res);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
    

}

