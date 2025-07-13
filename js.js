let prodList = [];
let currentPage = 1;
const productsPerPage = 24;
let currentDisplayedProducts = [];
let currentSearch = "";
let selectedCategory = "All"; // Initialize with "All"
let cart = [];
let categories = []; // To store unique categories extracted from prodList
let dbCategoriesData = []; // NEW: To store categories fetched from the database with their images

const userInfoDisplay = document.getElementById("userInfoDisplay");
const usernameDisplay = document.getElementById("usernameDisplay");
const btnRegister = document.getElementById("btn_Register");
const logoutBtn = document.getElementById("logoutBtn");

// --- INITIAL FETCH ---
// Fetch both products and categories concurrently
Promise.all([
  fetch("http://localhost:3000/products").then((res) => res.json()),
  fetch("http://localhost:3000/categories").then((res) => res.json()),
])
  .then(([productsData, categoriesData]) => {
    prodList = productsData;
    dbCategoriesData = categoriesData; // Store the fetched categories data

    currentPage = 1;
    displayProds(prodList, currentPage);
    extractAndDisplayCategories(prodList); // Populates the smaller circle categories
    renderFeaturedCategories(prodList); // Populates the larger featured categories
  })
  .catch((error) => console.error("Error fetching initial data:", error));

// --- NEW: Extract and Display Categories (for smaller circles) ---
function extractAndDisplayCategories(products) {
  // Use dbCategoriesData to get all categories, then add "All" and sort
  // Ensure that dbCategoriesData is populated before calling this.
  const uniqueCategoriesFromDb = dbCategoriesData.map((cat) => cat.name);
  categories = ["All", ...Array.from(new Set(uniqueCategoriesFromDb)).sort()]; // Use Set to ensure uniqueness if db has duplicates

  renderCategories(categories);
}

// --- UPDATED: Render Category Buttons (for smaller circles) ---
function renderCategories(categoryList) {
  const boxCate = document.querySelector(".box_cate");
  if (!boxCate) {
    console.error("Category container (.box_cate) not found.");
    return;
  }
  boxCate.innerHTML = ""; // Clear existing content

  // Removed the static categoryImageMap.
  // Images will now be fetched from dbCategoriesData.

  categoryList.forEach((categoryName) => {
    const cateDiv = document.createElement("div");
    cateDiv.className = "cate1";
    if (categoryName === selectedCategory) {
      cateDiv.classList.add("active");
    }

    cateDiv.onclick = () => filterByCategory(cateDiv);

    let categoryImageSrc;
    if (categoryName === "All") {
      // Provide a default image for the "All" category
      // You might want a specific "all products" icon or keep a generic placeholder
      categoryImageSrc = `https://placehold.co/50x50/cccccc/000000?text=All`;
    } else {
      // Find the category details from the fetched database categories
      const categoryDetails = dbCategoriesData.find(
        (cat) => cat.name === categoryName
      );
      // Use the image from the database, or a placeholder if not found
      categoryImageSrc =
        categoryDetails?.image ||
        `https://placehold.co/50x50/cccccc/000000?text=${categoryName.substring(
          0,
          2
        )}`;
    }

    cateDiv.innerHTML = `
      <div class="cate_img ${
        categoryName === selectedCategory ? "active" : ""
      }">
        <img src="${categoryImageSrc}" alt="${categoryName}">
      </div>
      <div class="cate_title">
        <span>${categoryName}</span>
      </div>
    `;
    boxCate.appendChild(cateDiv);
  });
}

// --- NEW: Render Featured Categories (for larger boxes) ---
function renderFeaturedCategories(products) {
  const featuredCategoryNames = [];

  featuredCategoryNames.forEach((categoryName) => {
    // Attempt to get image from dbCategoriesData first, fallback to featuredCategoryDetails
    const categoryData = dbCategoriesData.find(
      (cat) => cat.name === categoryName
    );
    const imageSource = categoryData?.image;

    if (categoryData) {
      // Proceed if either static details or database data exists
      const featuredDiv = document.createElement("div");
      const details = {}; // This 'details' variable was undefined, creating a placeholder
      featuredDiv.className = details?.className || "box_category_item"; // Use generic if no specific class

      // MODIFIED: Use description from categoryData if available, otherwise from details, otherwise empty
      const description =
        categoryData?.description || details?.description || "";

      featuredDiv.innerHTML = `
            <div class="title">
              <h1>${categoryName}</h1>
              <p>${description}</p>
            </div>
            <div class="pic">
              <img src="${
                imageSource ||
                `https://placehold.co/100x100?text=${categoryName}`
              }" alt="${categoryName}">
            </div>
          `;
    }
  });
}

// --- DISPLAY PRODUCTS ---
function displayProds(productList, page = 1) {
  currentDisplayedProducts = productList;
  const productAll = document.getElementById("prodAll");
  if (!productAll) {
    console.error("Product container (#prodAll) not found.");
    return;
  }
  productAll.innerHTML = ""; // Clear existing products
  const start = (page - 1) * productsPerPage;
  const end = start + productsPerPage;
  const paginatedProducts = productList.slice(start, end);

  paginatedProducts.forEach((prods, i) => {
    const indexInList = start + i;
    const prodItem = document.createElement("div");
    prodItem.className = "product-cards";
    prodItem.innerHTML = `
      <div class="product-tumb"><img src="${
        prods.image ||
        "https://placehold.co/200x200/cccccc/333333?text=No+Image"
      }" alt="${
      prods.name
    }" onerror="this.onerror=null;this.src='https://placehold.co/200x200/cccccc/333333?text=No+Image';"></div>
      <div class="product-details">
        <span class="product-catagory">${prods.category}</span>
        <h4><a href="#">${prods.name}</a></h4>
        <p>${prods.description}</p>
        <div class="product-bottom-details">
          <div class="product-price"><small>$${parseFloat(
            prods.priceSmall || 0
          ).toFixed(2)}</small></small> $${parseFloat(
      prods.priceLarge || 0
    ).toFixed(2)}</div>
          <div class="product-links">
            <a href="#"><i class="fa fa-heart"></i></a>
            <a href="javascript:void(0);" onclick="openProductModal(${indexInList})"><i class="fa fa-shopping-cart"></i></a>
          </div>
        </div>
      </div>
    `;
    productAll.appendChild(prodItem);
  });

  // FIX PAGE AUTO SCROLL
  const topEl = document.getElementById("container_allProduct");
  if (topEl && currentSearch) {
    // Only scroll if there's a search term
    topEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  renderPagination(productList);
}

// --- PAGINATION ---
function renderPagination(productList) {
  const pagination = document.getElementById("pagination");
  if (!pagination) {
    console.error("Pagination container (#pagination) not found.");
    return;
  }
  pagination.innerHTML = "";
  const pageCount = Math.ceil(productList.length / productsPerPage);
  if (pageCount <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      displayProds(currentDisplayedProducts, currentPage);
    }
  };
  pagination.appendChild(prevBtn);

  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => {
      currentPage = i;
      displayProds(currentDisplayedProducts, currentPage);
    };
    pagination.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage === pageCount;
  nextBtn.onclick = () => {
    if (currentPage < pageCount) {
      currentPage++;
      displayProds(currentDisplayedProducts, currentPage);
    }
  };
  pagination.appendChild(nextBtn);
}

let selectedProduct = null;
let selectedSize = null;
let selectedColor = null;

function openProductModal(indexInList) {
  const product = currentDisplayedProducts[indexInList];
  if (!product) return;

  selectedProduct = product;
  // Fallback fix for sizes and colors that might be strings
  if (!Array.isArray(product.sizes)) {
    try {
      product.sizes = JSON.parse(product.sizes || "[]");
    } catch {
      product.sizes = [];
    }
  }

  if (!Array.isArray(product.colors)) {
    try {
      product.colors = JSON.parse(product.colors || "[]");
    } catch {
      product.colors = [];
    }
  }

  // DEBUG
  console.log("Parsed sizes:", product.sizes);
  console.log("Parsed colors:", product.colors);

  selectedSize = null;
  selectedColor = null;

  // Set modal content
  document.getElementById("modal-img").src =
    product.image || "https://placehold.co/200x200/cccccc/333333?text=No+Image";
  document.getElementById("modal-img").onerror = function () {
    this.onerror = null;
    this.src = "https://placehold.co/200x200/cccccc/333333?text=No+Image";
  };
  document.getElementById("modal-category").textContent = product.category;
  document.getElementById("modal-name").textContent = product.name;
  document.getElementById("modal-description").textContent =
    product.description;
  const smallPriceHtml = product.priceSmall
    ? `<span style="color: black; font-size: 0.8em; text-decoration: line-through; margin-right: 8px;">$${parseFloat(
        product.priceSmall
      ).toFixed(2)}</span>`
    : "";
  const largePriceHtml = product.priceLarge
    ? `<span style="color: red; font-size: 1.5em; font-weight: bold;">$${parseFloat(
        product.priceLarge
      ).toFixed(2)}</span>`
    : "";
  document.getElementById(
    "modal-price"
  ).innerHTML = `${smallPriceHtml}${largePriceHtml}`;

  // Set Sizes
  const sizeContainer = document.getElementById("modal-sizes");
  sizeContainer.innerHTML = "";
  if (product.sizes && product.sizes.length > 0) {
    product.sizes.forEach((size) => {
      const sizeEl = document.createElement("span");
      sizeEl.className = "size-item";
      sizeEl.textContent = size;
      sizeEl.onclick = () => {
        selectedSize = size;
        document
          .querySelectorAll(".size-item")
          .forEach((el) => el.classList.remove("selected"));
        sizeEl.classList.add("selected");
      };
      sizeContainer.appendChild(sizeEl);
    });
  } else {
    sizeContainer.innerHTML = "<p>No sizes available</p>";
  }

  // Set Colors
  const colorContainer = document.getElementById("modal-colors");
  colorContainer.innerHTML = "";
  if (product.colors && product.colors.length > 0) {
    product.colors.forEach((color) => {
      const colorEl = document.createElement("div");
      colorEl.className = "color-item";
      colorEl.style.backgroundColor = color;
      colorEl.onclick = () => {
        selectedColor = color;
        document
          .querySelectorAll(".color-item")
          .forEach((el) => el.classList.remove("selected"));
        colorEl.classList.add("selected");
      };
      colorContainer.appendChild(colorEl);
    });
  } else {
    colorContainer.innerHTML = "<p>No colors available</p>";
  }

  console.log("Sizes:", product.sizes); // Debugging
  console.log("Colors:", product.colors); // Debugging

  // Show modal
  document.getElementById("productModal").style.display = "block";
}

function closeProductModal() {
  document.getElementById("productModal").style.display = "none";
}

// --- CART UI ---
document.getElementById("btn_cart").addEventListener("click", () => {
  renderCart(); // Update contents before showing
  document.getElementById("cartModal").style.display = "block";
  document.getElementById("order-btn").style.display = "block";
});

function closeCartModal() {
  document.getElementById("cartModal").style.display = "none";
}

function addToCart() {
  if (!selectedProduct) {
    console.log("No product selected."); // Replaced alert

    return;
  }
  // Check if product has sizes/colors and if they are selected
  if (
    
    selectedProduct.sizes &&
    selectedProduct.sizes.length > 0 &&
    !selectedSize
  ) {
       document.getElementById("errorSize").style.display = "flex";
    return;
  }else{
       document.getElementById("errorSize").style.display = "none";
  }
  if (
    selectedProduct.colors &&
    selectedProduct.colors.length > 0 &&
    !selectedColor
  ) {
       document.getElementById("errorColor").style.display = "flex";
    return;
  }else{
       document.getElementById("errorColor").style.display = "none";

  }

  // Determine the price based on selected size (if applicable, otherwise default to small)
  let itemPrice = parseFloat(selectedProduct.priceSmall || 0);
  if (
    selectedSize &&
    (selectedSize.toLowerCase().includes("l") ||
      selectedSize.toLowerCase().includes("xl") ||
      selectedSize.toLowerCase().includes("xxl") ||
      selectedSize.toLowerCase().includes("large"))
  ) {
    itemPrice = parseFloat(
      selectedProduct.priceSmall || selectedProduct.priceLarge || 0
    );
  } else {
    itemPrice = parseFloat(
      selectedProduct.priceLarge || selectedProduct.priceSmall || 0
    );
  }

  const existing = cart.find(
    (item) =>
      item.product.id === selectedProduct.id &&
      item.size === selectedSize &&
      item.color === selectedColor
  );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      product: { ...selectedProduct },
      size: selectedSize,
      color: selectedColor,
      qty: 1,
      price: itemPrice, // Store the determined price for the item
    });
  }

  closeProductModal();
  updateCartCount();
  renderCart();
}

function renderCart() {
  const table = document.getElementById("cartTableBody");
  if (!table) {
    console.error("Cart table body (#cartTableBody) not found.");
    return;
  }
  table.innerHTML = "";

  let totalAmount = 0;

  cart.forEach((item, index) => {
    const price = parseFloat(item.price || 0); // Use item.price and ensure it's a float
    const amount = item.qty * price;
    totalAmount += amount;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td style="text-align:center;">${index + 1}</td>
      <td><img src="${
        item.product.image ||
        "https://placehold.co/50x50/cccccc/333333?text=No+Image"
      }" style="width:50px;height:auto;" onerror="this.onerror=null;this.src='https://placehold.co/50x50/cccccc/333333?text=No+Image';"></td>
      <td>${item.product.name}</td>
      <td>${item.size || "N/A"}</td>
      <td>
        <div style="width:20px; height:20px; background:${
          item.color || "#ffffff"
        }; border-radius:50%; border:1px solid #ccc;"></div>
      </td>
      <td>$${price.toFixed(2)}</td>
      <td>
        <button onclick="changeQty(${index}, -1)" style="padding:2px 6px;">−</button>
        ${item.qty}
        <button onclick="changeQty(${index}, 1)" style="padding:2px 6px;">+</button>
      </td>
      <td>$${amount.toFixed(2)}</td>
    `;

    table.appendChild(tr);
  });

  if (cart.length === 0) {
    table.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px;">Your cart is empty.</td></tr>`;
  } else {
    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `
      <td colspan="7" style="text-align:right; font-weight:bold;">Total:</td>
      <td style="font-weight:bold;">$${totalAmount.toFixed(2)}</td>
      <td></td> <!-- Empty cell for remove button column -->
    `;
    table.appendChild(totalRow);
  }

  updateCartCount(); // update cart icon/label count
}

function changeQty(index, delta) {
  if (!cart[index]) return;

  cart[index].qty += delta;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1); // remove item if qty is 0
  }

  localStorage.setItem("cart", JSON.stringify(cart)); // Save to localStorage
  renderCart(); // Re-render cart
  updateCartCount(); // Also update the count in header/floating button
}

function removeItem(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart)); // Save to localStorage
  renderCart(); // Re-render cart
}

function updateCartCount() {
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.qty * parseFloat(item.price || 0), // Use item.price and ensure it's a float
    0
  );

  const btn = document.getElementById("btn_cart");
  if (btn) {
    btn.innerHTML = `Cart ( <span style="color: red;">${totalCount}</span> )`;
  }

  const floatingCartButton = document.getElementById("floatingCartButton");
  const floatingCartCountSpan = document.getElementById("floatingCartCount");

  if (floatingCartCountSpan) {
    floatingCartCountSpan.innerHTML = `$${totalAmount.toFixed(
      2
    )} - ${totalCount} Items`;
  }

  if (floatingCartButton) {
    if (totalCount > 0) {
      floatingCartButton.style.display = "block";
    } else {
      floatingCartButton.style.display = "none";
    }
  }
}

function submitOrder() {
  if (!cart || cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  // Optional: show what's in the cart
  console.log("Submitting order with cart:", cart);

  // Store cart items and other relevant info in localStorage for order confirmation page
  localStorage.setItem("orderCart", JSON.stringify(cart));
  localStorage.setItem(
    "orderInvoice",
    `INV-${Date.now().toString().slice(-6)}`
  );
  // These will be filled on the order confirmation page by the user or pre-filled from user profile
  localStorage.removeItem("orderPhoneNumber");
  localStorage.removeItem("orderLocationAddress");
  localStorage.removeItem("paymentMethod"); // Clear previous payment method

  // Get logged-in user's info if available
  const loggedInUsername = localStorage.getItem("loggedInUsername");
  const loggedInUserId = localStorage.getItem("loggedInUserId");
  if (loggedInUsername) {
    localStorage.setItem("orderUsername", loggedInUsername);
  } else {
    localStorage.removeItem("orderUsername"); // Clear if no user is logged in
  }

  // Redirect to order confirmation page
  window.location.href = "order-confirmation.html";
}

// --- SEARCH ---
document
  .getElementById("desktopSearchInput")
  .addEventListener("input", function () {
    const searchTerm = this.value.trim().toLowerCase();
    currentSearch = searchTerm;
    const filteredByCategory = prodList.filter(
      (p) =>
        selectedCategory === "All" ||
        p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
    const filteredProducts = filteredByCategory.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    displayProds(filteredProducts, currentPage);
  });

document
  .getElementById("mobileSearchInput")
  .addEventListener("input", function () {
    const searchTerm = this.value.trim().toLowerCase();
    currentSearch = searchTerm;
    const filteredByCategory = prodList.filter(
      (p) =>
        selectedCategory === "All" ||
        p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
    const filteredProducts = filteredByCategory.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    displayProds(filteredProducts, currentPage);
  });

// --- CATEGORY FILTER ---
function filterByCategory(element) {
  // Remove 'active' class from all category elements
  document.querySelectorAll(".cate1").forEach((c) => {
    c.classList.remove("active");
    c.querySelector(".cate_img")?.classList.remove("active");
  });

  // Add 'active' class to the clicked element
  element.classList.add("active");
  element.querySelector(".cate_img")?.classList.add("active");

  // Update selectedCategory based on the clicked element's text
  // Ensure consistency: use the text content directly.
  selectedCategory =
    element.querySelector(".cate_title span")?.textContent || "All";

  // Filter products based on the selected category and current search term
  const filteredByCategory = prodList.filter(
    (p) =>
      selectedCategory === "All" ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase() // Use strict equality for category name
  );

  const filteredProducts = filteredByCategory.filter((p) =>
    p.name.toLowerCase().includes(currentSearch.toLowerCase())
  );

  currentPage = 1;
  displayProds(filteredProducts, currentPage);
}

// REGISTER MODAL FUNCTION
// Function to open the main registration/login modal
function openAuthModal() {
  const containerRegister = document.getElementById("containerRegister");
  if (containerRegister) {
    containerRegister.style.display = "flex"; // Show with flex
    containerRegister.classList.add("active"); // Add active for transitions
    document.body.classList.add("modal-open"); // Add class to body to prevent scrolling
  }
}

// Function to close the main registration/login modal
function closeAuthModal() {
  const containerRegister = document.getElementById("containerRegister");
  if (containerRegister) {
    containerRegister.style.display = "none";
    containerRegister.classList.remove("active");
    document.body.classList.remove("modal-open"); // Remove class from body to allow scrolling
  }
}

// Get references to your forms and buttons *after* the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const signInButton = document.getElementById("signIn");
  const signUpButton = document.getElementById("signUp");
  const containerRegister = document.getElementById("containerRegister");

  // Handle URL hash for direct modal opening
  const handleHashChange = () => {
    if (window.location.hash === "#containerRegister") {
      console.log("Hash #containerRegister detected. Opening modal."); // Debugging line
      openAuthModal();
      // Optionally, remove the hash from the URL after opening the modal
      // This prevents the modal from reopening if the user refreshes the page
      // history.replaceState(null, null, window.location.pathname); // Change to window.location.pathname
    } else {
      console.log("No #containerRegister hash. Closing modal if open."); // Debugging line
      closeAuthModal(); // Close if hash is not for the modal
    }
  };

  // Listen for hash changes (e.g., when user clicks a link with #containerRegister)
  window.addEventListener("hashchange", handleHashChange);

  // Check hash on initial page load
  handleHashChange(); // Run once on load

  // This is the function to handle the registration submission
  function handleRegisterFormSubmit(event) {
    event.preventDefault(); // Prevent default form submission and page reload

    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;
    const termsAccepted = document.getElementById("termsService").checked;

    // Basic client-side validation
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (!termsAccepted) {
      alert("You must agree to the Terms of Service to register.");
      return;
    }

    console.log("Attempting to register user:", { name, email, password });

    // Send data to your Node.js backend
    fetch("http://localhost:3000/register", { // Corrected endpoint
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: name, email, password }), // Ensure payload matches server's expected keys
    })
      .then((response) => {
        if (!response.ok) {
          // If response is not 2xx, parse error and throw
          return response.json().then((err) => {
            throw new Error(err.error || "Registration failed");
          });
        }
        return response.json();
      })
      .then((data) => {
        alert("Registration successful! " + data.message);
        console.log("Registration data:", data);
        closeAuthModal(); // Close the modal on success
      })
      .catch((error) => {
        console.error("Error during registration:", error);
        alert(error.message); // Display the specific error from the server
      });
  }

  // This is the function to handle the login submission
  async function handleLoginFormSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    const email = document.getElementById("loginEmail").value; // Server expects username for login
    const password = document.getElementById("loginPassword").value;
    const username = email; // Assuming email is used as username for login based on server logic

    try {
      const response = await fetch("http://localhost:3000/login", { // Corrected endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }), // Ensure payload matches server's expected keys
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();
      alert("Login successful! Welcome, " + data.user.username); // Assuming your server returns user object with username

      // Store login status and username in localStorage
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loggedInUsername", data.user.username); // Store the username here!
      localStorage.setItem("loggedInUserId", data.user.id); // Store user ID if needed

      // For the order confirmation page, you also need to set "orderUsername"
      // This is a redundant step if "loggedInUsername" is used consistently,
      // but if "orderUsername" is a specific key you want to use for the order,
      // you can set it here as well.
      localStorage.setItem("orderUsername", data.user.username);

      // Update UI (e.g., hide login/register, show logout)
      updateHeaderUI();
      closeAuthModal(); // Close the modal after successful login

      // If the user logged in from order-confirmation.html, reload that page
      // to re-evaluate the login status and enable order placement.
      if (window.location.pathname.includes("order-confirmation.html")) {
        window.location.reload();
      } else {
        // Otherwise, redirect to home or stay on current page
        window.location.href = "index.html";
      }

      console.log("Login data:", data);
    } catch (error) {
      console.error("Error during login:", error);
      alert("Login failed: " + error.message);
    }
  }

  // Function to update the header UI based on login status
  function updateHeaderUI() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const username = localStorage.getItem("loggedInUsername"); // Get the stored username

    if (userInfoDisplay && usernameDisplay && btnRegister && logoutBtn) {
      if (isLoggedIn && username) {
        usernameDisplay.textContent = username;
        userInfoDisplay.style.display = "flex"; // Changed to flex for alignment
        btnRegister.style.display = "none";
        logoutBtn.style.display = "block";
      } else {
        userInfoDisplay.style.display = "none";
        btnRegister.style.display = "block";
        logoutBtn.style.display = "none";
      }
    }
  }

  // Add a logout function
  function logoutUser() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loggedInUsername"); // Clear username on logout
    localStorage.removeItem("loggedInUserId"); // Clear user ID on logout
    localStorage.removeItem("orderUsername"); // Also clear this if it's meant to be transient with login
    localStorage.removeItem("cart"); // Clear cart on logout for a clean session
    alert("You have been logged out.");
    updateHeaderUI(); // Update UI to reflect logout
    window.location.reload(); // Reload page to reflect logout state
  }

  // Add Event Listeners for form submissions
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterFormSubmit);
  }
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginFormSubmit);
  }

  if (btnRegister) {
    btnRegister.addEventListener("click", openAuthModal); // Use openAuthModal
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  // Event Listeners for the overlay buttons to switch panels
  if (signUpButton) {
    signUpButton.addEventListener("click", () => {
      if (containerRegister) {
        containerRegister.classList.add("right-panel-active");
      }
    });
  }

  if (signInButton) {
    signInButton.addEventListener("click", () => {
      if (containerRegister) {
        containerRegister.classList.remove("right-panel-active");
      }
    });
  }

  updateHeaderUI();
});

function getCartItemsFromModal() {
  return cart;
}

function submitOrder() {
  if (!cart || cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  // Optional: show what's in the cart
  console.log("Submitting order with cart:", cart);

  // Store cart items and other relevant info in localStorage for order confirmation page
  localStorage.setItem("orderCart", JSON.stringify(cart));
  localStorage.setItem(
    "orderInvoice",
    `INV-${Date.now().toString().slice(-6)}`
  );
  // These will be filled on the order confirmation page by the user or pre-filled from user profile
  localStorage.removeItem("orderPhoneNumber");
  localStorage.removeItem("orderLocationAddress");
  localStorage.removeItem("paymentMethod"); // Clear previous payment method

  // Get logged-in user's info if available
  const loggedInUsername = localStorage.getItem("loggedInUsername");
  const loggedInUserId = localStorage.getItem("loggedInUserId");
  if (loggedInUsername) {
    localStorage.setItem("orderUsername", loggedInUsername);
  } else {
    localStorage.removeItem("orderUsername"); // Clear if no user is logged in
  }

  // Redirect to order confirmation page
  window.location.href = "order-confirmation.html";
}

// --- SEARCH ---
document
  .getElementById("desktopSearchInput")
  .addEventListener("input", function () {
    const searchTerm = this.value.trim().toLowerCase();
    currentSearch = searchTerm;
    const filteredByCategory = prodList.filter(
      (p) =>
        selectedCategory === "All" ||
        p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
    const filteredProducts = filteredByCategory.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    displayProds(filteredProducts, currentPage);
  });

document
  .getElementById("mobileSearchInput")
  .addEventListener("input", function () {
    const searchTerm = this.value.trim().toLowerCase();
    currentSearch = searchTerm;
    const filteredByCategory = prodList.filter(
      (p) =>
        selectedCategory === "All" ||
        p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
    const filteredProducts = filteredByCategory.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    displayProds(filteredProducts, currentPage);
  });

// --- CATEGORY FILTER ---
function filterByCategory(element) {
  // Remove 'active' class from all category elements
  document.querySelectorAll(".cate1").forEach((c) => {
    c.classList.remove("active");
    c.querySelector(".cate_img")?.classList.remove("active");
  });

  // Add 'active' class to the clicked element
  element.classList.add("active");
  element.querySelector(".cate_img")?.classList.add("active");

  // Update selectedCategory based on the clicked element's text
  // Ensure consistency: use the text content directly.
  selectedCategory =
    element.querySelector(".cate_title span")?.textContent || "All";

  // Filter products based on the selected category and current search term
  const filteredByCategory = prodList.filter(
    (p) =>
      selectedCategory === "All" ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase() // Use strict equality for category name
  );

  const filteredProducts = filteredByCategory.filter((p) =>
    p.name.toLowerCase().includes(currentSearch.toLowerCase())
  );

  currentPage = 1;
  displayProds(filteredProducts, currentPage);
}
