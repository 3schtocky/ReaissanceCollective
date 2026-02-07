// Shared catalog loading utilities

async function loadCatalog() {
    const response = await fetch('data/catalog.json');
    if (!response.ok) {
        throw new Error('Failed to load catalog');
    }
    return response.json();
}

function getArtistById(catalog, id) {
    return catalog.artists.find(artist => artist.id === id) || null;
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function formatPrice(price) {
    return '$' + price.toFixed(2);
}
