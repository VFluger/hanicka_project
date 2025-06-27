console.log("Pets script loaded");
const loadContent = async () => {
  let users;
  let currentUser;
  await $.get("/api/home/users").done((data) => (users = data.users));
  await $.get("/api/home/current-user").done(
    (data) => (currentUser = data.user)
  );
  console.log(users);
  const usersHTML = users.map((user) => {
    let img;
    let canBeEdited = false;
    if (user._id === currentUser._id) {
      return;
    } else if (user.name === "Vojtík") {
      img = "/media/vojtik_character.png";
    } else if (user.name === "Hanička") {
      img = "/media/hanicka_character.png";
    } else {
      img = `/media/kid${Math.floor(Math.random() * 2 + 1)}.png`;
      canBeEdited = true;
    }
    return `<div class="user-container user-container" id="${user._id}">
      <div class="img-container">
      <img src="${img}" alt="avatar img">   
      </div>
      <div class="user-info">
      <div class="status-container">
      <input class="user-heading" value="${user.name}" disabled>
      ${canBeEdited ? `<i class="fa-solid fa-pen-to-square"></i>` : ""}
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
        <div class="user-actions">
        <button class="sleep-btn" data-id="${user._id}">Put to sleep</button>
        <button class="feed-btn" data-id="${user._id}">Feed</button>
        </div>
      </div>`;
  });
  $(".users-container").html(usersHTML.join(""));
};

loadContent();

$(document).on("click", ".sleep-btn", function () {
  console.log("Sleep button clicked");
  const userId = $(this).data("id");
  $.post("/api/home/family/put-to-sleep", { userId })
    .done((data) => {
      console.log(data);
      // random message
      const messages = [
        "Přečetli jste si o Pejskovi a kočičce...",
        "Všeci jste dali společnou cuddle session a odpočinuli si",
        "Uspala si všechny rajským plynem protože tě srali...",
        "Po namáhavé beat saber session jste si šli hajnout",
      ];
      const randomMessage =
        messages[Math.floor(Math.random() * messages.length)];
      //show popup
      $("#popup-overlay, #popup").fadeIn(200);
      $("#popup .heading").text(randomMessage);
      $("#popup img").attr("src", "/media/family-sleep.png");
      // update tiredness
      const userContainer = $(this).closest(".user-container");
      userContainer.find(".tiredness-text").text(`${data.tiredness}%`);
      userContainer.find(".tiredness-fill").css("width", `${data.tiredness}%`);
    })
    .fail((xhr) => console.error(xhr.responseJSON));
});
$(document).on("click", ".feed-btn", () => {
  // Just redirect to food page
  location.href = "/virtual-home/food";
});

$("#popup-overlay").click(() => $("#popup-overlay, #popup").fadeOut(200));

// Edit name of users
$(document).on("click", ".fa-pen-to-square", function () {
  console.log("Edit button clicked");
  const userInput = $(this).parent().find("input");
  userInput.prop("disabled", false).addClass("editing");
  userInput.focus();
  $(this).removeClass("fa-pen-to-square").addClass("fa-check");
});

$(document).on("click", ".fa-check", function () {
  console.log("Send edit button clicked");
  const userContainer = $(this).parent();
  const userInput = userContainer.find("input.user-heading");
  const userId = userContainer.parent().parent().attr("id");
  userInput.prop("disabled", true).removeClass("editing");
  $(this).removeClass("fa-check").addClass("fa-pen-to-square");
  console.log("New user name:", userInput.val());
  console.log("User ID:", userId);
  const newName = userInput.val();
  $.post("/api/home/change/rename", { type: "user", name: newName, id: userId })
    .done((data) => {
      if (!data.success) {
        // request failed, reload
        location.reload();
      }
    })
    .fail((xhr) => console.error(xhr.responseJSON));
});

// Allow pressing Enter while editing pet name to submit
$(document).on("keydown", "input.user-heading.editing", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    $(this).siblings(".fa-check").click();
  }
});
