const loadCards = () => {
  $.get("/api/all-cards")
    .done((data) => {
      console.log(data);
      if (!data.success) {
        return $(".cards-container").text("Error occured: ", data);
      }
      const htmlMap = data.cards.map((el) => {
        console.log(el);
        return `
        <div class="card ${el.seen ? "seen" : ""}" id='${el._id}'>
        <h2 class="heading">${el.heading}</h2>
        <p class="text-card"></p>
        <div class="close"><i class="fa-solid fa-xmark"></i></div>
        </div>
        `;
      });
      $(".cards-container").html(htmlMap);

      //Open card
      $(".card").click(function () {
        $(this).addClass("active");
        const heading = $(this).find(".heading");
        const textCard = $(this).find(".text-card");
        textCard.text("Loading...");
        $("#cards-overlay").addClass("active");
        heading.addClass("hide");
        //load data
        $.get("/api/card", { cardId: $(this).attr("id") }).done((data) => {
          console.log(data);
          if (!data.success) {
            console.error(data);
            return;
          }
          $(this).find(".text-card").text(data.card.text);
        });
      });

      //Close card
      $(".card .close").click(function (e) {
        e.stopPropagation(); // stop click from bubbling to .card
        $(".card").removeClass("active");
        $(".card .heading").removeClass("hide");
        $(".card .text-card").text("");
        $("#cards-overlay").removeClass("active");
        loadCards();
      });
    })
    .fail((xhr) => {
      if (!xhr.responseJSON.isLoggedIn) {
        console.log("You are not logged in.");
        $("#popup-overlay, #popup").fadeIn(200);
        return;
      }
      $("#popup").text("Error, sorry");
    });
};
loadCards();
