document.addEventListener("DOMContentLoaded", () => {
    const gridContainer = document.getElementById("image-grid");
    const TOTAL_BOXES = 256; // 16 x 16

    // Dynamically generate the 256 slots
    for (let i = 0; i < TOTAL_BOXES; i++) {
        const box = document.createElement("div");
        box.classList.add("grid-box");
        box.dataset.index = i;

        // Create hidden file input for standard clicking/tapping
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";

        box.appendChild(fileInput);
        gridContainer.appendChild(box);

        // --- Event Listeners ---

        // 1. Handle regular file selection (Click)
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file, box);
        });

        // 2. Drag Enter & Over
        box.addEventListener("dragenter", (e) => {
            e.preventDefault();
            box.classList.add("drag-over");
        });

        box.addEventListener("dragover", (e) => {
            e.preventDefault();
            box.classList.add("drag-over");
        });

        // 3. Drag Leave
        box.addEventListener("dragleave", () => {
            box.classList.remove("drag-over");
        });

        // 4. Drop File Feature
        box.addEventListener("drop", (e) => {
            e.preventDefault();
            box.classList.remove("drag-over");

            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith("image/")) {
                // Sync file back to the hidden input box if needed
                fileInput.files = files;
                handleImageFile(files[0], box);
            }
        });
    }

    // Helper function to convert file data into a displayable image preview
    function handleImageFile(file, targetBox) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            // Check if an image already exists inside this box
            let img = targetBox.querySelector("img");
            
            if (!img) {
                img = document.createElement("img");
                targetBox.appendChild(img);
                targetBox.classList.add("has-image");
            }
            
            // Set image source data
            img.src = event.target.result;
        };

        reader.readAsDataURL(file);
    }
});
