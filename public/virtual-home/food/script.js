let currentUser;
const loadContent = () => {
  $.get("/api/home/current-user")
    .done((data) => {
      console.log(data);
      const user = data.user;
      currentUser = user; // Store the current user globally
      // Setting status divs
      $(".hunger-text").text(user.hunger + "%");
      $(".hunger-fill").css("width", `${user.hunger}%`);
      if (user.hunger < 10) {
        $(".hunger-warning").text("You are starving!");
      }
      $(".tiredness-text").text(user.tiredness + "%");
      $(".tiredness-fill").css("width", `${user.tiredness}%`);
      if (user.tiredness > 90) {
        $(".tiredness-warning").text("You are exhausted!");
      }
    })
    .fail((xhr) => {
      console.error(xhr.responseJSON);
    });
  $.get("/api/home/food")
    .done((data) => {
      console.log(data);
      if (!data.success) {
        $(".food-container").html(
          '<p class="error">Failed to load food items.</p>'
        );
        return;
      }
      const foodItems = data.food;
      const foodContainer = $(".food-container");

      foodContainer.html(
        foodItems.map(
          (item) => `<div class="food-item" id="${item._id}">
          <img src="/media/${item.name}.png" alt="${item.name}">
          <h3>${item.name.slice(0, 1).toUpperCase() + item.name.slice(1)}</h3>
          <p>${item.hungerValue}🍖</p>
          <p>${
            item.isForPets
              ? "✅   Food IS for pets"
              : "❌   Food is NOT for pets"
          }</p>
          <div class="button-container">
          <button class="eat-btn">Eat</button>
          <button class="feed-btn">Feed</button>
          </div>
          </div>`
        )
      );
    })
    .fail((xhr) => console.error(xhr.responseJSON));
};

loadContent();

$(".food-container").on("click", ".eat-btn", function () {
  const id = $(this).parent().parent().attr("id");
  $.post("/api/home/feed", { foodId: id, userId: currentUser._id })
    .done((data) => {
      if (!data.success) {
        alert("Failed to eat the food item.");
        return;
      }
      location.reload();
    })
    .fail((xhr) => console.error(xhr.responseJSON));
});

let foodId;

$(".food-container").on("click", ".feed-btn", async function () {
  const id = $(this).parent().parent().attr("id");
  foodId = id; // Store the food ID globally
  //open popup with users and pets
  $("#popup-overlay, #popup").fadeIn(200);
  $("#popup .heading").text("Select who to give the food to:");
  $("#popup button").show();
  $("#popup .food-to-make-container").hide();
  $("#popup .feeders-container").html("");
});

$("#popup").on("click", "#users-btn", async function () {
  console.log("Users button clicked");
  let users;
  await $.get("/api/home/users").done((data) => (users = data.users));
  const usersHTML = users.map((user) => {
    if (user._id === currentUser._id) return "";
    if (user._id === "68568dca6fc69c7cea58f550") {
      // Handle Vojtik seperately
      return `<div class="feeder-container" id="${user._id}">
      <div class="img-container" id="vojtik-img-container">
      <img id="vojtik-img" src="/media/vojtik_character.png" alt="avatar img">
      </div>
      <div class="feeder-info">
      <h3>${user.name}</h3>
      <div class="status-container">
      <div class="status-inner">
      Hunger:
        <div class="hunger">
          <div class="hunger-fill" style="width: ${user.hunger}%"></div>
          <div class="hunger-text">${user.hunger}%</div>
        </div>
      </div>
      <div class="status-inner">
      Tiredness:
        <div class="tiredness">
          <div class="tiredness-fill" style="width: ${user.tiredness}%"></div>
          <div class="tiredness-text">${user.tiredness}%</div>
        </div>
      </div>
      </div>
    </div>
      </div>`;
    }
    if (user.isKid) {
      return `<div class="feeder-container" id="${user._id}">
      <div class="img-container">
      <img src="/media/${
        "kid" + Math.floor(Math.random() * 2 + 1)
      }.png" alt="avatar img">
      </div>
      <div class="feeder-info">
      <h3>${user.name}</h3>
      <div class="status-container">
      <div class="status-inner">
      Fullness:
        <div class="hunger">
          <div class="hunger-fill" style="width: ${user.hunger}%"></div>
          <div class="hunger-text">${user.hunger}%</div>
        </div>
      </div>
      <div class="status-inner">
      Tiredness:
        <div class="tiredness">
          <div class="tiredness-fill" style="width: ${user.tiredness}%"></div>
          <div class="tiredness-text">${user.tiredness}%</div>
        </div>
      </div>
    </div>
    </div>
      </div>`;
    }
    return "ERROR";
  });
  $("#popup .feeders-container").html(usersHTML.join(""));
  $(".feeder-container").on("click", function () {
    const isPet = $(this).hasClass("pet-container");
    const id = $(this).attr("id");
    //Send userId or petId based on the type
    $.post("/api/home/feed", {
      foodId,
      userId: isPet ? "" : id,
      petId: isPet ? id : "",
    }).done((data) => {
      if (!data.success) {
        alert("Failed to feed the item.");
        return;
      }
      location.reload();
    });
  });
});

//Pets feed btn
$("#popup").on("click", "#pets-btn", async function () {
  console.log("Pets button clicked");
  let pets;
  await $.get("/api/home/pets").done((data) => (pets = data.pets));
  const petsHTML = pets.map((pet) => {
    return `<div class="feeder-container pet-container" id="${pet._id}">
      <div class="img-container">
      <img src="/media/${pet.type}.png" alt="avatar img">   
      </div>
      <div class="feeder-info">
      <h3>${pet.name}</h3>
      <div class="status-container">
      <div class="status-inner">
      Hunger:
        <div class="hunger">
          <div class="hunger-fill" style="width: ${pet.hunger}%"></div>
          <div class="hunger-text">${pet.hunger}%</div>
        </div>
      </div>
      <div class="status-inner">
      Cuddles:
        <div class="tiredness">
          <div class="tiredness-fill" style="width: ${pet.cuddleNeed}%"></div>
          <div class="tiredness-text">${pet.cuddleNeed}%</div>
        </div>
      </div>
      <div class="status-inner">
      Playfulness:
        <div class="playfulness">
          <div class="playfulness-fill" style="width: ${pet.playNeed}%"></div>
          <div class="playfulness-text">${pet.playNeed}%</div>
        </div>
      </div>
      </div>
    </div>
    </div>
      </div>`;
  });
  $("#popup .feeders-container").html(petsHTML.join(""));
  $(".feeder-container").on("click", function () {
    const isPet = $(this).hasClass("pet-container");
    const id = $(this).attr("id");
    //Send userId or petId based on the type
    $.post("/api/home/feed", {
      foodId,
      userId: isPet ? "" : id,
      petId: isPet ? id : "",
    })
      .done((data) => {
        if (!data.success) {
          alert("Failed to feed the item.");
          return;
        }
        location.reload();
      })
      .fail((xhr) => {
        alert("Failed to feed the item, probably food not for pets.");
      });
  });
});

$(".make-food-btn").click(function () {
  // Open the make food popup
  $("#popup-overlay, #popup").fadeIn(200);
  $("#popup .heading").text("Select food to make:");
  $("#popup button").hide();
  $("#popup .feeders-container").html("");
  $("#popup .food-to-make-container").show();
});

$("#popup").on("click", ".food-to-make-item", function () {
  const foodId = $(this).attr("id");
  $.post("/api/home/activity/food", { foodType: foodId })
    .done((data) => {
      if (!data.success) {
        alert("Failed to make the food item.");
        return;
      }
      location.reload();
    })
    .fail((xhr) => console.error(xhr.responseJSON));
  $("#popup-overlay, #popup").fadeOut(200);
});

$("#popup-overlay").click(() => $("#popup-overlay, #popup").fadeOut(200));
