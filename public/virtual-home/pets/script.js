console.log("Pets script loaded");
const loadContent = async () => {
  let pets;
  await $.get("/api/home/pets").done((data) => (pets = data.pets));
  const petsHTML = pets.map((pet) => {
    const offsetOfEditBtn = pet.name.length * 10 + 10; // 8px per character + 10px padding
    return `<div class="pet-container pet-container" id="${pet._id}">
  <div class="img-container">
    <img src="/media/${pet.type}.png" alt="avatar img" />
  </div>
  <div class="pet-info">
    <div class="status-container">
      <input class="pet-heading" value="${pet.name}" disabled />
      <i
        class="fa-solid fa-pen-to-square edit-btn"
        style="left: ${offsetOfEditBtn}px"
      ></i>
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
    <div class="pet-actions">
    <button class="cuddle-btn" data-id="${pet._id}">Cuddle</button>
    <button class="play-btn" data-id="${pet._id}">Play</button>
    </div>
  </div>
</div>
  `;
  });
  $(".pets-container").html(petsHTML.join(""));
};

loadContent();

$(document).on("click", ".cuddle-btn", function () {
  console.log("Cuddle button clicked");
  const petId = $(this).data("id");
  $.post("/api/home/cuddle", { petId })
    .done((data) => {
      console.log(data);
      // random message
      const messages = [
        "Čiči se přišla pomazlit a celou dobu předla.",
        "Mazlili jste se s Vojtíkem a vaší kočičkou",
        "Kočka se rozhodla, že konečně příjde na mazlení a pets.",
        "Vojtík vzal tebe a vaší čiči na picknik a usnuli jste v trávě.",
      ];
      const randomMessage =
        messages[Math.floor(Math.random() * messages.length)];
      //show popup
      $("#popup-overlay, #popup").fadeIn(200);
      $("#popup .heading").text(randomMessage);
      $("#popup img").attr("src", "/media/pet-cuddle.png");
      // update cuddleNeed
      const petContainer = $(this).closest(".pet-container");
      petContainer.find(".tiredness-fill").css("width", `${data.cuddleNeed}%`);
      petContainer.find(".tiredness-text").text(`${data.cuddleNeed}%`);
    })
    .fail((xhr) => console.error(xhr.responseJSON));
});
$(document).on("click", ".play-btn", function () {
  console.log("Play button clicked");
  const petId = $(this).data("id");
  $.post("/api/home/play", { petId })
    .done((data) => {
      console.log(data);
      // random message
      const messages = [
        "Kočka si hrála s klubíčkem a byla nadšená!",
        "Vojtík házel míček a vaše kočka ho honila po celém bytě.",
        "Společně jste hráli na schovávanou a byla to zábava.",
        "Čiči lovila laserové ukazovátko a byla šťastná.",
      ];
      const randomMessage =
        messages[Math.floor(Math.random() * messages.length)];
      //show popup
      $("#popup-overlay, #popup").fadeIn(200);
      $("#popup .heading").text(randomMessage);
      $("#popup img").attr("src", "/media/pet-play.png");
      // update playNeed
      const petContainer = $(this).closest(".pet-container");
      petContainer.find(".playfulness-fill").css("width", `${data.playNeed}%`);
      petContainer.find(".playfulness-text").text(`${data.playNeed}%`);
    })
    .fail((xhr) => console.error(xhr.responseJSON));
});

$("#popup-overlay").click(() => $("#popup-overlay, #popup").fadeOut(200));

$(document).on("click", ".fa-pen-to-square", function () {
  console.log("Edit button clicked");
  const petInput = $(this).parent().find("input");
  petInput.prop("disabled", false).addClass("editing");
  petInput.focus();
  $(this)
    .removeClass("fa-pen-to-square")
    .addClass("fa-check")
    .css("left", "20px");
});

$(document).on("click", ".fa-check", function () {
  console.log("Send edit button clicked");
  const petContainer = $(this).parent();
  const petInput = petContainer.find("input.pet-heading");
  const petId = petContainer.parent().parent().attr("id");
  petInput.prop("disabled", true).removeClass("editing");
  $(this).removeClass("fa-check").addClass("fa-pen-to-square");
  console.log("New pet name:", petInput.val());
  console.log("Pet ID:", petId);
  const newName = petInput.val();
  $.post("/api/home/change/rename", { type: "pet", name: newName, id: petId })
    .done((data) => {
      if (!data.success) {
        // request failed, reload
        location.reload();
      }
      const offsetOfEditBtn = data.renamed.name.length * 20 + 15;
      $(this).css("left", `${offsetOfEditBtn}px`);
    })
    .fail((xhr) => console.error(xhr.responseJSON));
});

// Allow pressing Enter while editing pet name to submit
$(document).on("keydown", "input.pet-heading.editing", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    $(this).siblings(".fa-check").click();
  }
});
