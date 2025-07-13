const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("pass");
const formAdminLogin = document.getElementById("formAdminLogin");

document.querySelector(".form").addEventListener("submit", function (e) {
  e.preventDefault(); // Prevent form submission

  // Trim input values
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Check for empty fields
  if (email === "" || password === "") {
    if (email === "") emailInput.style.border = "2px solid red";
    else emailInput.style.border = "";

    if (password === "") passwordInput.style.border = "2px solid red";
    else passwordInput.style.border = "";

    return; // Stop here if empty
  }

  // Reset borders
  emailInput.style.border = "";
  passwordInput.style.border = "";

  // Check credentials
  if (email === "admin@gmail.com" && password === "123123") {
    formAdminLogin.style.display = "none";
    alert("Login successful!");
  } else {
    alert("Invalid email or password.");
    emailInput.style.border = "2px solid red";
    passwordInput.style.border = "2px solid red";
  }
});
