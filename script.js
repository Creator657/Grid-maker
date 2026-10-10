document.addEventListener("DOMContentLoaded", () => {
    const gridContainer = document.getElementById("image-grid");
    const recentShelf = document.getElementById("recent-shelf");
    const activeToolIndicator = document.getElementById("active-tool-indicator");
    const downloadPNGBtn = document.getElementById("downloadPNG");
    const downloadGridBtn = document.getElementById("downloadGrid");
    const loadGridInput = document.getElementById("loadGridFile");
    const autoSaveIndicator = document.getElementById("auto-save-indicator");
    const massStampUpload = document.getElementById("massStampUpload");
    const clearStampsBtn = document.getElementById("clearStampsBtn");

    const TOTAL_BOXES = 256;
    const AUTO_SAVE_KEY = "gridmaker-autosave";
    const AUTO_SAVE_EXPIRY_KEY = "gridmaker-autosave-expiry";
    const AUTO_SAVE_INTERVAL = 10000; // 10 seconds
    const AUTO_SAVE_DURATION = 3600000; // 1 hour in milliseconds

    let recentImages = [];
    let selectedRecentSrc = null;
    let draggedBox = null;
    let draggedRecentIndex = null;

    // Create the 256 squares
    for (let i = 0; i < TOTAL_BOXES; i++) {
        const box = document.createElement("div");
        box.classList.add("grid-box");
        box.dataset.index = i;
        box.draggable = true;

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";

        box.appendChild(fileInput);
        gridContainer.appendChild(box);

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-overlay";
        deleteBtn.innerHTML = "✕";
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            clearBox(box);
        });
        box.appendChild(deleteBtn);

        // Drag and drop for reordering
        box.addEventListener("dragstart", (e) => {
            const img = box.querySelector("img");
            if (!img) {
                e.preventDefault();
                return;
            }
            draggedBox = box;
            box.classList.add("dragging");
        });

        box.addEventListener("dragend", () => {
            box.classList.remove("dragging");
            draggedBox = null;
        });

        box.addEventListener("dragenter", (e) => {
            e.preventDefault();
            if (draggedBox && draggedBox !== box) {
                box.classList.add("drag-over");
            } else if (!draggedBox) {
                box.classList.add("drag-over");
            }
        });

        box.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        box.addEventListener("dragleave", () => {
            box.classList.remove("drag-over");
        });

        box.addEventListener("drop", (e) => {
            e.preventDefault();
            box.classList.remove("drag-over");

            // If dragging from another box (reorder)
            if (draggedBox && draggedBox !== box) {
                swapBoxes(draggedBox, box);
                autoSave();
                return;
            }

            // If uploading new file
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith("image/")) {
                processFile(files[0], box);
                autoSave();
            }
        });

        // Click for stamp tool or file upload
        box.addEventListener("click", (e) => {
            if (selectedRecentSrc) {
                e.preventDefault();
                e.stopPropagation();
                applyImageSrc(selectedRecentSrc, box);
                autoSave();
            } else {
                // If no recent image selected, trigger file input
                fileInput.click();
            }
        });

        // File input change
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0], box);
                autoSave();
            }
        });
    }

    function swapBoxes(box1, box2) {
        const img1 = box1.querySelector("img");
        const img2 = box2.querySelector("img");

        const src1 = img1 ? img1.src : null;
        const src2 = img2 ? img2.src : null;

        if (src1) {
            applyImageSrc(src1, box2);
        } else {
            clearBox(box2);
        }

        if (src2) {
            applyImageSrc(src2, box1);
        } else {
            clearBox(box1);
        }
    }

    function clearBox(box) {
        const img = box.querySelector("img");
        if (img) {
            img.remove();
        }
        box.classList.remove("has-image");
        autoSave();
    }

    function processFile(file, targetBox) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const imgSrc = event.target.result;
            applyImageSrc(imgSrc, targetBox);
            addToRecents(imgSrc);
        };
        reader.readAsDataURL(file);
    }

    function applyImageSrc(src, targetBox) {
        let img = targetBox.querySelector("img");
        if (!img) {
            img = document.createElement("img");
            targetBox.appendChild(img);
            targetBox.classList.add("has-image");
        }
        img.src = src;
    }

    function addToRecents(src) {
        recentImages = recentImages.filter(item => item !== src);
        recentImages.unshift(src);
        if (recentImages.length > 100) {
            recentImages.pop();
        }
        renderRecentShelf();
    }

    function moveRecentImage(fromIndex, toIndex) {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
        const [moved] = recentImages.splice(fromIndex, 1);
        recentImages.splice(toIndex, 0, moved);
        renderRecentShelf();
    }

    function clearAllRecentImages() {
        recentImages = [];
        selectedRecentSrc = null;
        activeToolIndicator.classList.add("hidden");
        renderRecentShelf();
    }

    function renderRecentShelf() {
        recentShelf.innerHTML = "";
        recentImages.forEach(src => {
            const imgEl = document.createElement("img");
            imgEl.src = src;
            imgEl.classList.add("recent-item");
            imgEl.draggable = true;

            if (selectedRecentSrc === src) {
                imgEl.classList.add("selected");
            }

            imgEl.addEventListener("dragstart", (e) => {
                e.dataTransfer.effectAllowed = "move";
                draggedRecentIndex = recentImages.indexOf(src);
                imgEl.classList.add("dragging");
            });

            imgEl.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            });

            imgEl.addEventListener("drop", (e) => {
                e.preventDefault();
                const targetIndex = recentImages.indexOf(src);
                if (draggedRecentIndex !== null && draggedRecentIndex !== targetIndex) {
                    moveRecentImage(draggedRecentIndex, targetIndex);
                }
                draggedRecentIndex = null;
                document.querySelectorAll(".recent-item").forEach(item => item.classList.remove("dragging"));
            });

            imgEl.addEventListener("dragend", () => {
                draggedRecentIndex = null;
                imgEl.classList.remove("dragging");
            });

            imgEl.addEventListener("click", (e) => {
                e.stopPropagation();
                if (selectedRecentSrc === src) {
                    selectedRecentSrc = null;
                    activeToolIndicator.classList.add("hidden");
                } else {
                    selectedRecentSrc = src;
                    activeToolIndicator.classList.remove("hidden");
                }

                document.querySelectorAll(".recent-item").forEach(item => {
                    item.classList.remove("selected");
                });
                if (selectedRecentSrc) imgEl.classList.add("selected");
            });

            recentShelf.appendChild(imgEl);
        });
    }

    function handleMassStampUpload(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        const validFiles = files.filter(file => file.type.startsWith("image/"));
        if (!validFiles.length) return;

        let loadedCount = 0;

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const src = loadEvent.target.result;
                addToRecents(src);
                loadedCount += 1;

                if (loadedCount === validFiles.length) {
                    massStampUpload.value = "";
                }
            };
            reader.readAsDataURL(file);
        });
    }

    if (massStampUpload) {
        massStampUpload.addEventListener("change", handleMassStampUpload);
    }

    if (clearStampsBtn) {
        clearStampsBtn.addEventListener("click", clearAllRecentImages);
    }

    // Auto-save functionality
    function autoSave() {
        const cells = Array.from(gridContainer.querySelectorAll(".grid-box")).map((box, index) => {
            const img = box.querySelector("img");
            return {
                index,
                src: img ? img.src : null
            };
        });

        const project = {
            type: "gridmaker-grid",
            version: 1,
            rows: 16,
            cols: 16,
            cells,
            savedAt: new Date().toISOString()
        };

        const expiry = new Date().getTime() + AUTO_SAVE_DURATION;

        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(project));
        localStorage.setItem(AUTO_SAVE_EXPIRY_KEY, expiry.toString());

        showAutoSaveIndicator();
    }

    function showAutoSaveIndicator() {
        if (!autoSaveIndicator) return;
        autoSaveIndicator.classList.add("visible");
        setTimeout(() => {
            autoSaveIndicator.classList.remove("visible");
        }, 1500);
    }

    function loadAutoSave() {
        const expiry = parseInt(localStorage.getItem(AUTO_SAVE_EXPIRY_KEY) || "0");
        if (new Date().getTime() > expiry) {
            localStorage.removeItem(AUTO_SAVE_KEY);
            localStorage.removeItem(AUTO_SAVE_EXPIRY_KEY);
            return;
        }

        const saved = localStorage.getItem(AUTO_SAVE_KEY);
        if (!saved) return;

        try {
            const project = JSON.parse(saved);
            const cells = project.cells || [];
            const boxList = Array.from(gridContainer.querySelectorAll(".grid-box"));

            cells.forEach((cell) => {
                if (!cell || typeof cell.index !== "number") return;
                const box = boxList[cell.index];
                if (!box || !cell.src) return;

                applyImageSrc(cell.src, box);
            });
        } catch (error) {
            console.error("Failed to load auto-save:", error);
        }
    }

    // Set up periodic auto-save
    setInterval(autoSave, AUTO_SAVE_INTERVAL);

    // Load auto-save on page load
    loadAutoSave();

    // Export current grid as PNG
    function exportGridPNG() {
        const canvas = document.createElement("canvas");
        const cellSize = 64;
        const cols = 16;
        const rows = 16;

        canvas.width = cols * cellSize;
        canvas.height = rows * cellSize;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const boxes = Array.from(gridContainer.querySelectorAll(".grid-box"));

        boxes.forEach((box, index) => {
            const img = box.querySelector("img");
            if (!img) return;

            const x = (index % cols) * cellSize;
            const y = Math.floor(index / cols) * cellSize;

            ctx.drawImage(img, x, y, cellSize, cellSize);
        });

        const link = document.createElement("a");
        link.download = "grid.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

    // Export current grid state as custom .grid file
    function exportGridFile() {
        const cells = Array.from(gridContainer.querySelectorAll(".grid-box")).map((box, index) => {
            const img = box.querySelector("img");
            return {
                index,
                src: img ? img.src : null
            };
        });

        const project = {
            type: "gridmaker-grid",
            version: 1,
            rows: 16,
            cols: 16,
            cells
        };

        const blob = new Blob([JSON.stringify(project, null, 2)], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "project.grid";
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 300);
    }

    // Load a saved .grid file
    function importGridFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const project = JSON.parse(event.target.result);

                const cells = project.cells || project.images || [];
                const boxList = Array.from(gridContainer.querySelectorAll(".grid-box"));

                boxList.forEach((box) => {
                    const input = box.querySelector("input[type='file']");
                    box.innerHTML = "";
                    box.appendChild(input);
                    const deleteBtn = document.createElement("button");
                    deleteBtn.className = "delete-overlay";
                    deleteBtn.innerHTML = "✕";
                    deleteBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        clearBox(box);
                    });
                    box.appendChild(deleteBtn);
                    box.classList.remove("has-image");
                });

                cells.forEach((cell) => {
                    if (!cell || typeof cell.index !== "number") return;
                    const box = boxList[cell.index];
                    if (!box) return;

                    if (cell.src) {
                        applyImageSrc(cell.src, box);
                    }
                });

                autoSave();
            } catch (error) {
                alert("Invalid .grid file. Please choose a valid project file.");
            }
        };
        reader.readAsText(file);
    }

    downloadPNGBtn.addEventListener("click", exportGridPNG);
    downloadGridBtn.addEventListener("click", exportGridFile);

    loadGridInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        importGridFile(file);
        loadGridInput.value = "";
    });

    // ==================== PIZZA COLLAGE TOOL ====================
    const fileInput = document.getElementById('fileInput');
    const rotationSlider = document.getElementById('rotationSlider');
    const rotationVal = document.getElementById('rotationVal');
    const imageList = document.getElementById('imageList');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('collageCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    let uploadedImages = [];

    if (fileInput) fileInput.addEventListener('change', handleUpload);
    if (rotationSlider) rotationSlider.addEventListener('input', (e) => {
        rotationVal.textContent = `${e.target.value}°`;
        renderCollage();
    });
    if (downloadBtn) downloadBtn.addEventListener('click', downloadCollage);

    function handleUpload(e) {
        const files = Array.from(e.target.files);
        let loadedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    uploadedImages.push({
                        id: Date.now() + Math.random(),
                        imgElement: img,
                        name: file.name
                    });
                    loadedCount++;
                    if (loadedCount === files.length) {
                        updateUI();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
        fileInput.value = '';
    }

    function updateUI() {
        renderImageList();
        renderCollage();
        if (downloadBtn) downloadBtn.disabled = uploadedImages.length === 0;
    }

    function renderImageList() {
        imageList.innerHTML = '';
        uploadedImages.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'image-item';

            div.innerHTML = `
                <img src="${item.imgElement.src}" alt="preview">
                <span class="image-item-name">${item.name}</span>
                <div class="order-btns">
                    <button class="action-btn" onclick="window.moveSlice(${index}, -1)">▲</button>
                    <button class="action-btn" onclick="window.moveSlice(${index}, 1)">▼</button>
                    <button class="action-btn delete" onclick="window.deleteSlice(${index})">✕</button>
                </div>
            `;
            imageList.appendChild(div);
        });
    }

    window.moveSlice = function(index, direction) {
        const targetIndex = index + direction;
        if (targetIndex >= 0 && targetIndex < uploadedImages.length) {
            const temp = uploadedImages[index];
            uploadedImages[index] = uploadedImages[targetIndex];
            uploadedImages[targetIndex] = temp;
            updateUI();
        }
    };

    window.deleteSlice = function(index) {
        uploadedImages.splice(index, 1);
        updateUI();
    };

    function renderCollage() {
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const numSlices = uploadedImages.length;
        if (numSlices === 0) {
            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6b7280';
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Upload images to generate layout preview', canvas.width / 2, canvas.height / 2);
            return;
        }

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = Math.hypot(canvas.width, canvas.height);
        const sliceAngle = (2 * Math.PI) / numSlices;
        const userRotation = (parseInt(rotationSlider.value) * Math.PI) / 180;

        uploadedImages.forEach((item, i) => {
            ctx.save();
            
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            
            const startAngle = (i * sliceAngle) - (Math.PI / 2) + userRotation;
            const endAngle = ((i + 1) * sliceAngle) - (Math.PI / 2) + userRotation;
            
            ctx.lineTo(cx + radius * Math.cos(startAngle), cy + radius * Math.sin(startAngle));
            ctx.lineTo(cx + radius * Math.cos(endAngle), cy + radius * Math.sin(endAngle));
            ctx.closePath();
            ctx.clip();
            
            const img = item.imgElement;
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.restore();
        });
    }

    function downloadCollage() {
        if (uploadedImages.length === 0) return;
        const link = document.createElement('a');
        link.download = 'pizza_slice_collage.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    if (canvas) renderCollage();

    // ==================== NAVIGATION ====================
    const navBtns = document.querySelectorAll('.nav-btn');
    const toolSections = document.querySelectorAll('.tool-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tool = e.target.dataset.tool;
            
            navBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            toolSections.forEach(section => section.classList.remove('active'));
            document.getElementById(`${tool}-tool`).classList.add('active');
        });
    });
});
