// ░█▀▀█ ░█▀▀▀█ ░█▀▀█ ░█─── ░█▀▀▀█ ▀▄░▄▀ 
// ░█▄▄▀ ░█──░█ ░█▀▀▄ ░█─── ░█──░█ ─░█── 
// ░█─░█ ░█▄▄▄█ ░█▄▄█ ░█▄▄█ ░█▄▄▄█ ▄▀░▀▄ 

// ░█─░█ ░█▀▀▀█ ░█▀▀█ ░█▀▀█ ░█▀▀▀█ ░█▀▀█ ░█─── ▀█▀ ░█▀▀▀█ ▀▀█▀▀ 
// ░█▀▀█ ░█──░█ ░█▄▄▀ ░█▄▄▀ ░█──░█ ░█▄▄▀ ░█─── ░█─ ─▀▀▀▄▄ ─░█── 
// ░█─░█ ░█▄▄▄█ ░█─░█ ░█─░█ ░█▄▄▄█ ░█─░█ ░█▄▄█ ▄█▄ ░█▄▄▄█ ─░█── 

// ───░█ ░█▀▀▀█ 
// ─▄─░█ ─▀▀▀▄▄ 
// ░█▄▄█ ░█▄▄▄█

// Created by nouhidev

const maxUIDChunkSize = 100;
const API_BASE_URL = "https://ndevapi.com";

const data = {
    databaseData: [],
    gameData: [],
    gameIconData: [],
};

const CACHE_PREFIX = "filteredGameDataCache_";
const CACHE_EXPIRATION = 2592000000;
const DB_NAME = "filteredGameDataDB";
const DB_VERSION = 1;
let db;
let dataTable = null;

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = event => reject(event.target.error);
        request.onsuccess = event => resolve(event.target.result);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            db.createObjectStore("gameDataCache", { keyPath: "cacheKey" });
        };
    });
}

async function saveToCache(cacheKey, data) {
    const transaction = db.transaction(["gameDataCache"], "readwrite");
    const store = transaction.objectStore("gameDataCache");
    const cacheData = { cacheKey, data, timestamp: Date.now() };
    store.put(cacheData);
    await transaction.complete;
}

async function fetchFromCache(cacheKey) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["gameDataCache"], "readonly");
        const store = transaction.objectStore("gameDataCache");
        const request = store.get(cacheKey);
        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(event.target.error);
    });
}

// Function to create a cache key with the category information
function getCategoryCacheKey(sortKey, category) {
    return `${CACHE_PREFIX}${sortKey}_${category}`;
}

async function fetchDataAndCache(endpoint, sortKey, category) {
    const cacheKey = getCategoryCacheKey(sortKey, category);
    const cachedData = await fetchFromCache(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRATION) {
        return cachedData.data;
    }

    const response = await fetch(endpoint);
    const freshData = await response.json();
    await saveToCache(cacheKey, freshData);
    return freshData;
}


window.onload = async function () {
    usageDisplay();
    $('header').hide();
    document.getElementsByClassName("loading-bar")[0].style.display = "none";
};

async function fetchAndDisplayGames(sortKey) {
    try {
        if (dataTable != null) {
            dataTable.destroy();
            $('header').hide();
        }

        document.getElementsByClassName("loading-bar")[0].style.display = "block";

        const table = document.getElementById("table-to-populate");
        const mobileTable = document.getElementById("mobile-table-to-populate");
        const elem = document.getElementById("myBar");

        db = await openDB();

        const databaseDataResponse = await fetch("https://robloxhorrorlist.com/weights-database.json");
        const databaseData = await databaseDataResponse.json();

        let gameUIDS = databaseData.games
            .filter(element => element.ambience !== "")
            .map(element => element.uid);

            let totalRatings = 0;

        function sortByCategory(sortKey, category, gameUIDS, databaseData) {
            databaseData.games.sort(function (a, b) {
                return parseFloat(b.ratings[category]) - parseFloat(a.ratings[category]);
            });

            for (const game of databaseData.games) {
                totalRatings += parseFloat(game.ratings[sortKey]);
            }

            // Overwrite ratings of database
            for (let i = 0; i < gameUIDS.length; i++) {
                const categoryRating = databaseData.games[i].ratings[sortKey];
                databaseData.games[i].ratings.rating = categoryRating;
            }
        }

        switch (sortKey) {
            case "scariness":
                sortByCategory(sortKey, "scariness", gameUIDS, databaseData);
                break;
            case "soundDesign":
                sortByCategory(sortKey, "soundDesign", gameUIDS, databaseData);
                break;
            case "story":
                sortByCategory(sortKey, "story", gameUIDS, databaseData);
                break;
            case "visuals":
                sortByCategory(sortKey, "visuals", gameUIDS, databaseData);
                break;
            case "ambience":
                sortByCategory(sortKey, "ambience", gameUIDS, databaseData);
                break;
            case "gameplay":
                sortByCategory(sortKey, "gameplay", gameUIDS, databaseData);
                break;
            case "creativity":
                sortByCategory(sortKey, "creativity", gameUIDS, databaseData);
                break;
            case "enjoyment":
                sortByCategory(sortKey, "enjoyment", gameUIDS, databaseData);
                break;
            case "productionQuality":
                sortByCategory(sortKey, "productionQuality", gameUIDS, databaseData);
                break;
            case "technical":
                sortByCategory(sortKey, "technical", gameUIDS, databaseData);
                break;
        }

        // Get the UIDS again in correct order
        gameUIDS = databaseData.games
            .filter(element => element.ambience !== "")
            .map(element => element.uid);

        const chunks = [];
        for (let i = 0; i < gameUIDS.length; i += maxUIDChunkSize) {
            chunks.push(gameUIDS.slice(i, i + maxUIDChunkSize));
        }

        const fetchGameDataPromises = chunks.map(chunk =>
            fetchDataAndCache(`${API_BASE_URL}/game-info/${chunk.join(",")}`, sortKey, `gameData_${chunk.join(",")}`)
        );

        const fetchIconDataPromises = chunks.map(chunk =>
            fetchDataAndCache(`${API_BASE_URL}/game-icon/${chunk.join(",")}`, sortKey, `gameIconData_${chunk.join(",")}`)
        );

        const [gameDataResponses, iconDataResponses] = await Promise.all([
            Promise.all(fetchGameDataPromises),
            Promise.all(fetchIconDataPromises),
        ]);

        const gameDataFromAPI = gameDataResponses.flat()
            .map(item => item.data)
            .flat();

        const gameIconDataFromAPI = iconDataResponses.flat()
            .map(item => item.data)
            .flat();


        const numGames = databaseData.games.length;

        const averageRating = totalRatings / numGames;

        const fragment = document.createDocumentFragment();

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            document.getElementsByClassName("mobile-table-container")[0].style.display = "block";
            document.getElementsByClassName("table-container")[0].style.display = "none";
            for (let i = 0; i < gameUIDS.length; i++) {
                mobileTable.innerHTML = "";
                try {
                    let differenceToAverageRating = Math.abs((parseFloat(databaseData.games[i].ratings.rating) - averageRating)).toFixed(1);
                    let spanHTML = "";
                    if (differenceToAverageRating < 0) spanHTML = `<span style="color: red; font-size: 10px;">-${differenceToAverageRating}↓</span> `;
                    else spanHTML = `<span style="color: green; font-size: 10px;">${differenceToAverageRating}↑</span> `;
                    if (differenceToAverageRating == 0) spanHTML = `<span style="color: gray; font-size: 10px;">${differenceToAverageRating}-</span> `;

                    var row = ` <tr class="hover-reveal">
                      <td data-th="Placement">${i + 1}.</td>
                      <td data="Icon"><img class="game-icon" src="${gameIconDataFromAPI[i].imageUrl}"></td>
                      <td data-th="Title" class="game-title"><a href="#" class="game-href" onclick="loadGame(
                        ${i + 1}, 
                        ${gameUIDS[i]})">${gameDataFromAPI[i].name}</a></td>
                      <td data-th="Rating" class="align-left">${databaseData.games[i].ratings.rating}/10  ${spanHTML}</td>
                      </tr>`;

                    const rowElement = document.createElement('tr');
                    rowElement.innerHTML = row;
                    fragment.appendChild(rowElement);
                } catch (e) {
                    console.error(e);
                }
            }
            mobileTable.appendChild(fragment);


            elem.style.width = "100%";

            await delay(500);

            $('header').show();
            document.getElementsByClassName("loading-bar")[0].style.display = "none";

            // Generate Table after populating it
            dataTable = $("#game-table").DataTable({
                columnDefs: [{ orderable: false, targets: [1, 3] }],
                responsive: true
            });
        }
        else {

            for (let i = 0; i < gameUIDS.length; i++) {
                table.innerHTML = "";
                try {
                    let differenceToAverageRating = Math.abs((parseFloat(databaseData.games[i].ratings.rating) - averageRating)).toFixed(1);
                    let spanHTML = "";
                    if (differenceToAverageRating < 0) spanHTML = `<span style="color: red; font-size: 10px;">-${differenceToAverageRating}↓</span> `;
                    else spanHTML = `<span style="color: green; font-size: 10px;">${differenceToAverageRating}↑</span> `;
                    if (differenceToAverageRating == 0) spanHTML = `<span style="color: gray; font-size: 10px;">${differenceToAverageRating}-</span> `;

                    var row = ` <tr class="hover-reveal">
                    <td data-th="Placement">${i + 1}.</td>
                    <td data="Icon"><img class="game-icon" src="${gameIconDataFromAPI[i].imageUrl}"></td>
                    <td data-th="Title" class="game-title"><a href="#" class="game-href" onclick="loadGame(
                        ${i + 1}, 
                        ${gameUIDS[i]})">${gameDataFromAPI[i].name}</a></td>
                    <td data-th="Creator" class="align-left">${JSON.parse(
                        JSON.stringify(gameDataFromAPI[i].creator)
                    ).name}</td>
                    <td data-th="Rating" class="align-left">${databaseData.games[i].ratings.rating}/10  ${spanHTML}</td>
                    </tr>`;

                    const rowElement = document.createElement('tr');
                    rowElement.innerHTML = row;
                    fragment.appendChild(rowElement);
                } catch (e) {
                    console.error(e);
                }
            }
            table.appendChild(fragment);

            elem.style.width = "100%";

            await delay(500);

            $('header').show();
            document.getElementsByClassName("loading-bar")[0].style.display = "none";

            // Generate Table after populating it
            dataTable = $("#game-table").DataTable({
                columnDefs: [{ orderable: false, targets: [1, 4] }],
                responsive: true
            });
        }

        // document.getElementsByTagName("footer")[0].style.bottom = "auto";

    } catch (error) {
        console.error("An error occurred:", error);
    }

}

async function usageDisplay() {
    console.log(`                                                                                         
    #     # ######  ####### #     #                                             
    ##    # #     # #       #     #                                             
    # #   # #     # #       #     #                                             
    #  #  # #     # #####   #     #                                             
    #   # # #     # #        #   #                                              
    #    ## #     # #         # #                                               
    #     # ######  #######    #          

    ######  ####### ######  #       ####### #     #                             
    #     # #     # #     # #       #     #  #   #                              
    #     # #     # #     # #       #     #   # #                               
    ######  #     # ######  #       #     #    #                                
    #   #   #     # #     # #       #     #   # #                               
    #    #  #     # #     # #       #     #  #   #                              
    #     # ####### ######  ####### ####### #     #      

    #     # ####### ######  ######  ####### ######  #       ###  #####  ####### 
    #     # #     # #     # #     # #     # #     # #        #  #     #    #    
    #     # #     # #     # #     # #     # #     # #        #  #          #    
    ####### #     # ######  ######  #     # ######  #        #   #####     #    
    #     # #     # #   #   #   #   #     # #   #   #        #        #    #    
    #     # #     # #    #  #    #  #     # #    #  #        #  #     #    #    
    #     # ####### #     # #     # ####### #     # ####### ###  #####     #    

          #  #####                                                              
          # #     #                                                             
          # #                                                                   
          #  #####                                                              
    #     #       #                                                             
    #     # #     #                                                             
     #####   #####                                                              
                        
    Learn more at
    
    https://nouhi.dev/ndev-assets-docs/.
      `);
}

function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function githubButton() {
    window.open("https://github.com/NouhiDev/roblox-horrorlist", "_blank");
}

function youtubeButton() {
    window.open("https://www.youtube.com/@robloxhorrorlist", "_blank");
}

function discordButton() {
    window.open("https://discord.gg/Zbxst3g4ts", "_blank");
}

function twitterButton() {
    window.open("https://twitter.com/RBLXHorrorlist", "_blank");
}

function loadGame(number, UID) {
    localStorage.setItem('number', number);
    localStorage.setItem('UID', UID);
    window.open('game.html', '_blank');
}
document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("ratingDropdown");
    const submitButton = document.getElementById("submitButton");

    submitButton.addEventListener("click", () => {
        const selectedCategory = dropdown.value;
        fetchAndDisplayGames(selectedCategory);
    });
});