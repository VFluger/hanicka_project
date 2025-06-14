// $("#compliment").text("testing");
$.get("/api/compliment", (data) => {
  // handle not logged in
  if (!data.success) {
    $("#compliment").text(`ERROR: ${data.error}`);
  }
  // handle already seen
  if (data.alreadySeen) {
    return $("#compliment").text(data.compliment.text).addClass("text");
  }
  // handle new one
  $("#compliment").text("Click to reveal todays...").addClass("reveal");
  $("#compliment").click((e) => {
    $(".card").addClass("reveal-animate");
    setTimeout(() => {
      $("#compliment")
        .removeClass("reveal")
        .addClass("text")
        .text(data.compliment.text);
    }, 1000);
  });
});

$("#write-comp-heading").click(() => {
  if ($(".write-compliment-container").hasClass("visible")) {
    $("#write-comp-heading i").removeClass("rotate");
    $(".write-compliment-container").removeClass("visible");
    return;
  }
  $("#write-comp-heading i").addClass("rotate");
  $(".write-compliment-container").addClass("visible");
});
