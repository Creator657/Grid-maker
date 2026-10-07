document.addEventListener("DOMContentLoaded", () => {
    const gridContainer = document.getElementById("image-grid");
    const recentShelf = document.getElementById("recent-shelf");
    const activeToolIndicator = document.getElementById("active-tool-indicator");
    
    const TOTAL_BOXES = 256; 
    let recentImages = []; // Stores base64 data strings of the last 30 unique images
    let selectedRecentSrc = null; // Keeps track of which image we are "stamping"

    // --- 1. Dynamically Generate Grid ---
    for (let i = 0; i < TOTAL_BOXES; i++) {
        const box = document.createElement("div");
        box.classList.add("grid-box");
        box.dataset.index = i;

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";

        box.appendChild(fileInput);
        gridContainer.appendChild(box);

        // Intercept box clicks to handle "Stamping" vs "Uploading"
        box.addEventListener("click", (e) => {
            if (selectedRecentSrc) {
                // If a recent image is selected, prevent file window and stamp it instead
                e.preventDefault();
                applyImageSrc(selectedRecentSrc, box);
            }
        });

        // Handle regular manual upload selection
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0], box);
            }
        });

        // Drag & Drop behaviors
        box.addEventListener("dragenter", (e) => { e.preventDefault(); box.classList.add("drag-over"); });
        box.addEventListener("dragover", (e) => { e.preventDefault(); box.classList.add("drag-over"); });
        box.addEventListener("dragleave", () => box.classList.remove("drag-over"));
        box.addEventListener("drop", (e) => {
            e.preventDefault();
            box.classList.remove("drag-over");
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith("image/")) {
                fileInput.files = files; // link browser reference
                processFile(files[0], box);
            }
        });
    }

    // --- 2. Handle File Processing & History Tracking ---
    function processFile(file, targetBox) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const imgSrc = event.target.result;
            
            // Render onto the box
            applyImageSrc(imgSrc, targetBox);
            
            // Add to recents tracking array
            addToRecents(imgSrc);
        };
        reader.readAsDataURL(file);
    }

    // Pushes image data onto the grid element visually
    function applyImageSrc(src, targetBox) {
        let img = targetBox.querySelector("img");
        if (!img) {
            img = document.createElement("img");
            targetBox.appendChild(img);
            targetBox.classList.add("has-image");
        }
        img.src = src;
    }

    // --- 3. Recent Shelf Logic ---
    function addToRecents(src) {
        // If image is already in our history tracker, remove it first to bring it to front
        recentImages = recentImages.filter(item => item !== src);
        
        // Add new image to the front of list
        recentImages.unshift(src);
        
        // Enforce maximum cap of 30 items
        if (recentImages.length > 30) {
            recentImages.pop();
        }
        
        renderRecentShelf();
    }

    function renderRecentShelf() {
        recentShelf.innerHTML = ""; // Wipe shelf UI layout
        
        recentImages.forEach(src => {
            const imgEl = document.createElement("img");
            imgEl.src = src;
            imgEl.classList.add("recent-item");
            
            // Maintain active visually selected class if redrawing shelf
            if (selectedRecentSrc === src) {
                imgEl.classList.add("selected");
            }

            // Click behavior to turn image into a "stamp tool"
            imgEl.addEventListener("click", () => {
                if (selectedRecentSrc === src) {
                    // Clicked again -> Deselect everything
                    selectedRecentSrc = null;
                    activeToolIndicator.classList.add("hidden");
                } else {
                    // Select this image as stamp tool
                    selectedRecentSrc = src;
                    activeToolIndicator.classList.remove("hidden");
                }
                
                // Refresh selection styles on items
                document.querySelectorAll(".recent-item").forEach(item => {
                    item.classList.remove("selected");
                });
                if (selectedRecentSrc) imgEl.classList.add("selected");
            });

            recentShelf.appendChild(imgEl);
        });
    }
});
