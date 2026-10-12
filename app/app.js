import {api, CloudStore, enablePush, disablePush, codexRequest, isMobileDevice} from './cloud.js';
import {moveGroupedRecord,restoreWork,mergeGroups,splitGroup,projectRecords,putRecord,patchGroup,sortedWorkGroups,newestRecords,groupRecords,ALL_THEMES,THEMES,today,shiftDate,weekStart,activeThemes,themesByDate,flowerStage,validateRecord,emptyState,validateState,weekSummary,demoState,validateRoutine,validateCheckin,routineDue,saveRoutineAnswer,routineTime} from './model.js';
// Wanted Montage IconClose and IconCheckThick (MIT); see THIRD_PARTY_NOTICES.md.
const closeIcon = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M4.86349 4.86346C5.21496 4.51199 5.78481 4.51199 6.13628 4.86346L11.9999 10.7271L17.8634 4.86346C18.2149 4.51199 18.7848 4.51199 19.1362 4.86346C19.4877 5.21493 19.4877 5.78478 19.1362 6.13625L13.2726 11.9999L19.1362 17.8635C19.4877 18.2149 19.4877 18.7848 19.1362 19.1363C18.7848 19.4877 18.2149 19.4877 17.8634 19.1363L11.9999 13.2727L6.13628 19.1363C5.78481 19.4877 5.21496 19.4877 4.86349 19.1363C4.51202 18.7848 4.51202 18.2149 4.86349 17.8635L10.7271 11.9999L4.86349 6.13625C4.51202 5.78478 4.51202 5.21493 4.86349 4.86346Z" fill="currentColor"/></svg>';
const mobileDevice=isMobileDevice();
const stampCheck = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"><path d="M19.6697 6.58096C20.1774 7.08864 20.1774 7.91175 19.6697 8.41943L10.6697 17.4194C10.1621 17.9271 9.33894 17.9271 8.83126 17.4194L4.33126 12.9194C3.82358 12.4118 3.82358 11.5886 4.33126 11.081C4.83894 10.5733 5.66206 10.5733 6.16974 11.081L9.7505 14.6617L17.8313 6.58096C18.3389 6.07327 19.1621 6.07327 19.6697 6.58096Z" fill="currentColor"/></svg>';
const themeIcons = {"money": "<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M3.60012 6.26021C3.60011 6.25652 3.6001 6.25282 3.6001 6.24912C3.6001 4.77151 4.89967 3.80957 6.28325 3.25705C7.75331 2.67001 9.75063 2.34887 12.0002 2.34912C14.2496 2.34937 16.2468 2.67051 17.7168 3.25739C19.0979 3.80876 20.3954 4.768 20.4 6.24125C20.4001 6.244 20.4001 6.24676 20.4001 6.24951V17.4995L20.4 17.5096C20.394 18.9814 19.0973 19.9402 17.7169 20.4914C16.2468 21.0785 14.2495 21.3996 12 21.3994C9.75056 21.3991 7.75331 21.078 6.28332 20.4911C4.89982 19.9387 3.6001 18.9771 3.6001 17.4994L3.60012 17.4927V13.7605L3.6001 13.7494L3.60012 13.7427V10.0105L3.6001 9.99937L3.60012 9.99266V6.26021ZM5.40011 6.24553C5.40251 5.9725 5.6787 5.43668 6.9508 4.92869C8.14203 4.45299 9.89469 4.14889 12 4.14912C14.1054 4.14936 15.8581 4.45347 17.0494 4.92909C18.3272 5.43923 18.6001 5.97732 18.6001 6.24912C18.6001 6.52102 18.327 7.05932 17.0493 7.56955C15.8581 8.04525 14.1055 8.34936 12.0002 8.34912C9.89476 8.34889 8.14202 8.04477 6.95073 7.56916C5.67991 7.06179 5.4031 6.52679 5.40012 6.25359V6.24951L5.40011 6.24553ZM18.6001 8.81872V9.99261L18.6001 9.99937C18.6001 10.2713 18.327 10.8096 17.0493 11.3198C15.8581 11.7955 14.1055 12.0996 12.0002 12.0994C9.89476 12.0991 8.14202 11.795 6.95073 11.3194C5.67991 10.812 5.4031 10.277 5.40012 10.0038V8.81847C5.68202 8.9796 5.98067 9.12002 6.28332 9.24085C7.75331 9.82774 9.75056 10.1489 12 10.1491C14.2495 10.1494 16.2468 9.82824 17.7169 9.24119C18.0195 9.12033 18.3182 8.97988 18.6001 8.81872ZM5.40012 13.7538V12.5687C5.68202 12.7298 5.98067 12.8703 6.28332 12.9911C7.75331 13.578 9.75056 13.8991 12 13.8994C14.2495 13.8996 16.2468 13.5785 17.7169 12.9914C18.0195 12.8706 18.3182 12.7301 18.6001 12.569V13.7425L18.6001 13.7494C18.6001 14.0213 18.327 14.5596 17.0493 15.0698C15.8581 15.5455 14.1055 15.8496 12.0002 15.8494C9.89476 15.8491 8.14202 15.545 6.95073 15.0694C5.67991 14.562 5.4031 14.027 5.40012 13.7538ZM17.7169 16.7414C18.0195 16.6206 18.3182 16.4801 18.6001 16.319V17.4925L18.6001 17.4994C18.6001 17.7713 18.327 18.3096 17.0493 18.8198C15.8581 19.2955 14.1055 19.5996 12.0002 19.5994C9.89476 19.5991 8.14202 19.295 6.95073 18.8194C5.67881 18.3116 5.40262 17.7761 5.40011 17.5031L5.40012 17.4995V16.3187C5.68202 16.4798 5.98067 16.6203 6.28332 16.7411C7.75331 17.328 9.75056 17.6491 12 17.6494C14.2495 17.6496 16.2468 17.3285 17.7169 16.7414Z\" fill=\"currentColor\" /></svg>", "career": "<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M8.99989 10.1C8.50283 10.1 8.09989 10.5029 8.09989 11C8.09989 11.4971 8.50283 11.9 8.99989 11.9H14.9999C15.4969 11.9 15.8999 11.4971 15.8999 11C15.8999 10.5029 15.4969 10.1 14.9999 10.1H8.99989Z\" fill=\"currentColor\" /><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M9.57023 2.09998H14.4297C14.684 2.09995 14.9261 2.09993 15.1301 2.11659C15.3525 2.13476 15.6076 2.17715 15.8625 2.30707C16.2201 2.48923 16.5107 2.77989 16.6929 3.1374C16.8228 3.39237 16.8652 3.64748 16.8833 3.86989C16.9 4.07385 16.9 4.3159 16.9 4.57022L16.9 5.59998L17.8354 5.59998C18.3652 5.59996 18.8164 5.59995 19.1868 5.63022C19.576 5.66201 19.9546 5.73165 20.3165 5.91606C20.8622 6.19409 21.3058 6.63774 21.5839 7.18341C21.7683 7.54534 21.8379 7.92393 21.8697 8.31309C21.9 8.68351 21.8999 9.13466 21.8999 9.6645V16.8354C21.8999 17.3652 21.9 17.8165 21.8697 18.1869C21.8379 18.576 21.7683 18.9546 21.5839 19.3166C21.3058 19.8622 20.8622 20.3059 20.3165 20.5839C19.9546 20.7683 19.576 20.8379 19.1868 20.8697C18.8164 20.9 18.3653 20.9 17.8354 20.9H6.16459C5.63476 20.9 5.18353 20.9 4.81312 20.8697C4.42396 20.8379 4.04536 20.7683 3.68343 20.5839C3.13776 20.3059 2.69412 19.8622 2.41609 19.3166C2.23168 18.9546 2.16204 18.576 2.13025 18.1869C2.09998 17.8165 2.09999 17.3653 2.10001 16.8355V9.66458C2.09999 9.13474 2.09998 8.68351 2.13025 8.31309C2.16204 7.92393 2.23168 7.54534 2.41609 7.18341C2.69412 6.63774 3.13776 6.19409 3.68343 5.91606C4.04536 5.73165 4.42396 5.66201 4.81312 5.63022C5.18355 5.59995 5.63473 5.59996 6.16459 5.59998L7.1 5.59998L7.09999 4.57022C7.09997 4.3159 7.09995 4.07385 7.11661 3.86989C7.13478 3.64748 7.17717 3.39237 7.30708 3.1374C7.48924 2.77989 7.7799 2.48923 8.13741 2.30707C8.39239 2.17715 8.6475 2.13476 8.8699 2.11659C9.07387 2.09993 9.31591 2.09995 9.57023 2.09998ZM15.1 4.00002V5.60002H8.89998V4.00002C8.89998 3.9448 8.94475 3.90002 8.99998 3.90002H15C15.0552 3.90002 15.1 3.94479 15.1 4.00002ZM5.79998 7.40002C4.98542 7.40002 4.79159 7.41113 4.66007 7.45386C4.32519 7.56267 4.06264 7.82522 3.95383 8.16011C3.91109 8.29163 3.89999 8.48546 3.89999 9.30002V17.2C3.89999 18.0146 3.91109 18.2084 3.95383 18.3399C4.06264 18.6748 4.32519 18.9374 4.66007 19.0462C4.79159 19.0889 4.98542 19.1 5.79998 19.1H18.1999C19.0145 19.1 19.2083 19.0889 19.3398 19.0462C19.6747 18.9374 19.9373 18.6748 20.0461 18.3399C20.0888 18.2084 20.0999 18.0146 20.0999 17.2V9.30002C20.0999 8.48546 20.0888 8.29163 20.0461 8.16011C19.9373 7.82522 19.6747 7.56267 19.3398 7.45386C19.2083 7.41113 19.0145 7.40002 18.1999 7.40002H5.79998Z\" fill=\"currentColor\" /></svg>", "health": "<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M1.50006 9.4001C1.50006 5.93664 4.17005 3.1001 7.60004 3.1001C9.34251 3.1001 10.8974 3.83723 12 5.01883C13.1027 3.83723 14.6575 3.1001 16.4 3.1001C19.83 3.1001 22.5 5.93664 22.5 9.4001C22.5 11.04 21.9064 12.4208 20.9792 13.7026C20.0691 14.9607 18.8031 16.1683 17.4124 17.4596L17.4082 17.4635L13.6686 20.8915C13.4958 21.0499 13.3299 21.202 13.1792 21.3198C13.0137 21.4492 12.812 21.5821 12.5557 21.6605C12.1935 21.7712 11.8065 21.7712 11.4444 21.6605C11.1881 21.5821 10.9864 21.4492 10.8209 21.3198C10.6701 21.202 10.5043 21.0499 10.3314 20.8915L6.59189 17.4635L6.58764 17.4596C5.19696 16.1683 3.93093 14.9607 3.02085 13.7026C2.09362 12.4208 1.50006 11.04 1.50006 9.4001ZM7.60003 4.8999C5.23003 4.8999 3.30004 6.86336 3.30004 9.3999C3.30004 10.56 3.70648 11.5792 4.47924 12.6474C5.26876 13.7388 6.402 14.8307 7.81033 16.1384L11.9324 19.9171C11.9707 19.9521 12.0293 19.9521 12.0676 19.917L16.1897 16.1384C17.598 14.8306 18.7313 13.7388 19.5208 12.6474C20.2935 11.5792 20.7 10.56 20.7 9.3999C20.7 6.86336 18.77 4.8999 16.4 4.8999C14.8671 4.8999 13.5322 5.71317 12.7691 6.96893C12.6059 7.23757 12.3144 7.40158 12 7.40158C11.6857 7.40158 11.3941 7.23757 11.2309 6.96893C10.4678 5.71317 9.13295 4.8999 7.60003 4.8999Z\" fill=\"currentColor\" /></svg>"};
const navIcons = {"today": "<svg viewBox=\"0 0 24 24\" fill=\"none\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12.3616 2.27647C12.1248 2.21318 11.8755 2.21318 11.6387 2.27647C11.3579 2.3515 11.1251 2.5333 11.0025 2.62905L10.9675 2.65625L4.13427 7.88153C3.74746 8.17676 3.42128 8.42572 3.17853 8.75002C2.96523 9.03498 2.80621 9.35676 2.70942 9.69929C2.59927 10.0891 2.59965 10.4995 2.60009 10.9861L2.60015 17.335C2.60014 17.8648 2.60012 18.316 2.63039 18.6865C2.66218 19.0756 2.73182 19.4542 2.91623 19.8161C3.19426 20.3618 3.6379 20.8055 4.18357 21.0835C4.5455 21.2679 4.9241 21.3375 5.31326 21.3693C5.68367 21.3996 6.13483 21.3996 6.66467 21.3996H11.9898C11.9933 21.3996 11.9969 21.3996 12.0004 21.3996C12.0039 21.3996 12.0075 21.3996 12.011 21.3996H17.3355C17.8653 21.3996 18.3166 21.3996 18.687 21.3693C19.0761 21.3375 19.4547 21.2679 19.8167 21.0835C20.3623 20.8055 20.806 20.3618 21.084 19.8161C21.2684 19.4542 21.338 19.0756 21.3698 18.6865C21.4001 18.316 21.4001 17.8649 21.4001 17.335L21.4001 10.9861C21.4006 10.4994 21.401 10.0891 21.2908 9.69929C21.194 9.35676 21.035 9.03498 20.8217 8.75002C20.5789 8.42572 20.2528 8.17677 19.866 7.88153L13.0328 2.65625L12.9977 2.62905C12.8751 2.5333 12.6423 2.3515 12.3616 2.27647ZM12.9004 19.5994H17.7001C18.5147 19.5994 18.7085 19.5883 18.84 19.5456C19.1749 19.4368 19.4374 19.1742 19.5463 18.8393C19.589 18.7078 19.6001 18.514 19.6001 17.6994V10.883C19.6001 10.4628 19.5965 10.3673 19.5816 10.2869C19.5445 10.0871 19.4528 9.90143 19.3166 9.75057C19.2618 9.68986 19.1881 9.62903 18.8542 9.37376L12.0001 4.1324L5.146 9.37376C4.81217 9.62903 4.73848 9.68986 4.68367 9.75057C4.54748 9.90143 4.45574 10.0871 4.41864 10.2869C4.4037 10.3673 4.40015 10.4628 4.40015 10.883V17.6994C4.40015 18.514 4.41126 18.7078 4.45399 18.8393C4.5628 19.1742 4.82535 19.4368 5.16023 19.5456C5.29175 19.5883 5.48559 19.5994 6.30014 19.5994H11.1004V13.9996C11.1004 13.5026 11.5033 13.0996 12.0004 13.0996C12.4975 13.0996 12.9004 13.5026 12.9004 13.9996V19.5994Z\" fill=\"currentColor\" /></svg>", "future": "<svg viewBox=\"0 0 24 24\" fill=\"none\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M5.15007 16.1492L5.2776 16.1067C7.47391 15.3746 9.86668 15.5071 11.9687 16.4773L12.3451 16.651C14.1477 17.4829 16.1433 17.8068 18.1165 17.5875L18.5151 17.5432C19.7305 17.4082 20.6501 16.3808 20.6501 15.1579V4.50049C20.6501 4.24449 20.541 4.00061 20.3503 3.82988C20.1595 3.65914 19.9051 3.57773 19.6507 3.606L17.9177 3.79854C16.2704 3.98158 14.6043 3.71122 13.0994 3.01663L12.0873 2.5495C9.97785 1.57593 7.57668 1.44294 5.37266 2.17761C4.16479 2.58023 3.35007 3.7106 3.35007 4.98381V15.4795C3.34974 15.4934 3.34974 15.5073 3.35007 15.5212V21.0005C3.35007 21.4975 3.75301 21.9005 4.25007 21.9005C4.74712 21.9005 5.15007 21.4975 5.15007 21.0005V16.1492ZM11.333 4.18383C9.63933 3.40215 7.71145 3.29538 5.94187 3.88524C5.46901 4.04286 5.15007 4.48537 5.15007 4.98381V14.2621C7.65732 13.5429 10.3454 13.7456 12.723 14.8429L13.0994 15.0166C14.6043 15.7112 16.2704 15.9816 17.9177 15.7985L18.3163 15.7543C18.6202 15.7205 18.8501 15.4637 18.8501 15.1579V5.50603L18.1165 5.58754C16.1433 5.80678 14.1477 5.48294 12.3451 4.65096L11.333 4.18383Z\" fill=\"currentColor\" /></svg>", "review": "<svg viewBox=\"0 0 24 24\" fill=\"none\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M9.39998 2.4C9.39998 1.90294 8.99703 1.5 8.49998 1.5C8.00292 1.5 7.59998 1.90294 7.59998 2.4V3.49978H6.9148C6.38495 3.49977 5.93375 3.49975 5.56333 3.53002C5.17417 3.56182 4.79558 3.63145 4.43364 3.81586C3.88798 4.0939 3.44433 4.53754 3.1663 5.08321C2.98189 5.44514 2.91226 5.82374 2.88046 6.2129C2.8502 6.58331 2.85021 7.03446 2.85022 7.5643V17.7352C2.85021 18.265 2.8502 18.7163 2.88046 19.0867C2.91226 19.4758 2.98189 19.8544 3.1663 20.2164C3.44433 20.762 3.88798 21.2057 4.43364 21.4837C4.79558 21.6681 5.17417 21.7377 5.56333 21.7695C5.93374 21.7998 6.38488 21.7998 6.91471 21.7998H17.0856C17.6154 21.7998 18.0666 21.7998 18.437 21.7695C18.8262 21.7377 19.2048 21.6681 19.5667 21.4837C20.1124 21.2057 20.556 20.762 20.8341 20.2164C21.0185 19.8544 21.0881 19.4758 21.1199 19.0867C21.1502 18.7163 21.1502 18.2651 21.1502 17.7353V7.56438C21.1502 7.03455 21.1502 6.58331 21.1199 6.2129C21.0881 5.82374 21.0185 5.44514 20.8341 5.08321C20.556 4.53754 20.1124 4.0939 19.5667 3.81586C19.2048 3.63145 18.8262 3.56182 18.437 3.53002C18.0666 3.49975 17.6155 3.49977 17.0856 3.49978H16.4V2.40002C16.4 1.90297 15.997 1.50002 15.5 1.50002C15.0029 1.50002 14.6 1.90297 14.6 2.40002V3.49978H9.39998V2.4ZM14.6 6.40002V5.29978H9.39998V6.4C9.39998 6.89706 8.99703 7.3 8.49998 7.3C8.00292 7.3 7.59998 6.89706 7.59998 6.4V5.29978H6.55023C5.73567 5.29978 5.54184 5.31088 5.41032 5.35361C5.07543 5.46242 4.81288 5.72498 4.70407 6.05986C4.66134 6.19138 4.65024 6.38521 4.65024 7.19978V9.24976H19.3502V7.19978C19.3502 6.38521 19.3391 6.19138 19.2963 6.05986C19.1875 5.72498 18.925 5.46242 18.5901 5.35361C18.4586 5.31088 18.2647 5.29978 17.4502 5.29978H16.4V6.40002C16.4 6.89708 15.997 7.30002 15.5 7.30002C15.0029 7.30002 14.6 6.89708 14.6 6.40002ZM19.3502 11.0498H4.65024V18.0998C4.65024 18.9143 4.66134 19.1082 4.70407 19.2397C4.81288 19.5746 5.07543 19.8371 5.41032 19.9459C5.54184 19.9887 5.73567 19.9998 6.55023 19.9998H17.4502C18.2647 19.9998 18.4586 19.9887 18.5901 19.9459C18.925 19.8371 19.1875 19.5746 19.2963 19.2397C19.3391 19.1082 19.3502 18.9143 19.3502 18.0998V11.0498Z\" fill=\"currentColor\" /></svg>", "settings": "<svg viewBox=\"0 0 24 24\" fill=\"none\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M8.04978 12C8.04978 9.81848 9.81824 8.05 11.9998 8.05C14.1813 8.05 15.9497 9.81848 15.9497 12C15.9497 14.1815 14.1813 15.95 11.9998 15.95C9.81824 15.95 8.04978 14.1815 8.04978 12ZM11.9998 9.95C10.8676 9.95 9.94977 10.8678 9.94977 12C9.94977 13.1322 10.8676 14.05 11.9998 14.05C13.1319 14.05 14.0498 13.1322 14.0498 12C14.0498 10.8678 13.1319 9.95 11.9998 9.95Z\" fill=\"currentColor\" /> <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M10.131 1.97079C10.7375 1.85842 11.3622 1.7998 11.9998 1.7998C12.6373 1.7998 13.262 1.85841 13.8685 1.97079C14.91 2.16373 15.3502 3.11319 15.4926 3.70446C15.589 4.10473 15.8414 4.46312 16.2246 4.68433C16.6074 4.90536 17.0436 4.94495 17.4382 4.82865C18.0214 4.65674 19.0614 4.56445 19.749 5.36716C20.5589 6.31261 21.1993 7.40878 21.6221 8.60855C21.9736 9.60576 21.3725 10.4599 20.9322 10.8783C20.6337 11.1619 20.4496 11.5597 20.4496 12.0022C20.4496 12.4444 20.6335 12.842 20.9317 13.1256C21.3718 13.5442 21.9725 14.3986 21.6205 15.3956C21.1964 16.5973 20.5539 17.695 19.7415 18.6412C19.055 19.4408 18.0185 19.3502 17.4362 19.1795C17.0422 19.064 16.607 19.1039 16.2249 19.3245C15.8429 19.545 15.5908 19.9019 15.4937 20.3007C15.3502 20.8905 14.9095 21.8357 13.8712 22.0283C13.2638 22.141 12.6382 22.1998 11.9998 22.1998C11.3615 22.1998 10.7361 22.1411 10.1289 22.0284C9.09016 21.8358 8.64947 20.89 8.50609 20.3001C8.40912 19.9012 8.15698 19.5441 7.77485 19.3235C7.39266 19.1028 6.9573 19.063 6.56327 19.1786C5.98082 19.3494 4.94393 19.4403 4.25726 18.6403C3.44569 17.6949 2.80382 16.5983 2.37979 15.3978C2.02766 14.4009 2.62805 13.5464 3.06801 13.1277C3.36596 12.8442 3.54974 12.4467 3.54974 12.0046C3.54974 11.5621 3.36551 11.1641 3.06692 10.8805C2.62657 10.4623 2.02535 9.60831 2.3765 8.61109C2.7991 7.41098 3.43935 6.31446 4.2492 5.36869C4.93695 4.56551 5.97742 4.658 6.56079 4.83006C6.95543 4.94645 7.39173 4.90689 7.77465 4.68582C8.15798 4.4645 8.41054 4.10587 8.50681 3.70537C8.649 3.11389 9.08914 2.16382 10.131 1.97079ZM10.4986 3.83504C10.4943 3.83949 10.4882 3.84629 10.4804 3.85628C10.4386 3.91001 10.3876 4.01039 10.3542 4.14947C10.1412 5.03543 9.5776 5.83881 8.72465 6.33126C7.87264 6.82317 6.89631 6.90993 6.0233 6.65245C5.88632 6.61205 5.77405 6.60604 5.70654 6.61545C5.69368 6.61725 5.68458 6.61918 5.67848 6.62077C5.02983 7.38223 4.51682 8.26159 4.17593 9.22152C4.1776 9.2275 4.18044 9.23613 4.18518 9.2478C4.21072 9.31067 4.27198 9.40465 4.37543 9.50291C5.03595 10.1303 5.44973 11.0199 5.44973 12.0046C5.44973 12.9881 5.03696 13.8768 4.37784 14.5041C4.27448 14.6024 4.21332 14.6965 4.18784 14.7594C4.18311 14.771 4.18029 14.7797 4.17862 14.7856C4.52067 15.7459 5.03501 16.6253 5.68507 17.3866C5.69114 17.3881 5.7002 17.3901 5.713 17.3919C5.78016 17.4013 5.89193 17.3954 6.02853 17.3554C6.90026 17.0997 7.87449 17.1871 8.72485 17.678C9.57507 18.1689 10.1378 18.9688 10.3523 19.8514C10.386 19.9899 10.4369 20.0897 10.4787 20.1431C10.4864 20.1531 10.4925 20.1598 10.4969 20.1642C10.9836 20.2532 11.4858 20.2998 11.9998 20.2998C12.5139 20.2998 13.0162 20.2532 13.5031 20.1642C13.5074 20.1597 13.5135 20.153 13.5213 20.1431C13.563 20.0897 13.6139 19.99 13.6476 19.8515C13.8623 18.9692 14.425 18.1697 15.2749 17.679C16.125 17.1882 17.099 17.1007 17.9705 17.3562C18.1071 17.3962 18.2188 17.402 18.2859 17.3926C18.2987 17.3908 18.3078 17.3889 18.3138 17.3873C18.9646 16.6254 19.4794 15.7451 19.8216 14.7839C19.8199 14.7779 19.8171 14.7692 19.8123 14.7576C19.7868 14.6947 19.7256 14.6007 19.6222 14.5023C18.9627 13.875 18.5496 12.986 18.5496 12.0022C18.5496 11.0177 18.9632 10.1283 19.6234 9.50092C19.7269 9.40263 19.7881 9.30862 19.8136 9.24574C19.8184 9.23408 19.8212 9.22544 19.8229 9.21946C19.4818 8.2598 18.9687 7.38071 18.32 6.61951C18.3139 6.61792 18.3048 6.61599 18.2919 6.6142C18.2245 6.60479 18.1123 6.61078 17.9754 6.65113C17.1025 6.90841 16.1264 6.82157 15.2746 6.32978C14.4221 5.83756 13.8586 5.0347 13.6454 4.14925C13.6119 4.01024 13.561 3.90995 13.5191 3.85626C13.5113 3.84628 13.5053 3.83949 13.5009 3.83504C13.0147 3.74629 12.5131 3.6998 11.9998 3.6998C11.4865 3.6998 10.9848 3.74629 10.4986 3.83504ZM19.8251 9.2087L19.8249 9.21084L19.8251 9.2087ZM19.8238 14.7946L19.8236 14.7925L19.8238 14.7946ZM4.17636 14.7964L4.1766 14.7943L4.17636 14.7964ZM4.17366 9.21077L4.1739 9.21292L4.17366 9.21077Z\" fill=\"currentColor\" /></svg>"};
navIcons.routines="<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path\n        d=\"M11.4999 6.59971C11.9969 6.59971 12.3998 7.00265 12.3998 7.49971V12.127L14.611 14.3382C14.9625 14.6897 14.9625 15.2595 14.611 15.611C14.2595 15.9624 13.6897 15.9624 13.3382 15.611L10.8633 13.1361C10.6838 12.9566 10.596 12.7201 10.5999 12.4848V7.49971C10.5999 7.00265 11.0028 6.59971 11.4999 6.59971Z\"\n        fill=\"currentColor\"\n      /><path\n        fill-rule=\"evenodd\"\n        clip-rule=\"evenodd\"\n        d=\"M12 2.1001C6.5324 2.1001 2.10004 6.53248 2.10004 12.0001C2.10004 17.4677 6.5324 21.9001 12 21.9001C17.4676 21.9001 21.9 17.4677 21.9 12.0001C21.9 6.53248 17.4676 2.1001 12 2.1001ZM3.90003 12.0001C3.90003 7.52659 7.52651 3.9001 12 3.9001C16.4735 3.9001 20.1 7.52659 20.1 12.0001C20.1 16.4736 16.4735 20.1001 12 20.1001C7.52651 20.1001 3.90003 16.4736 3.90003 12.0001Z\"\n        fill=\"currentColor\"\n      /></svg>";
const KEY='bomi.local.v1';
const app=document.querySelector('#app'), dialog=document.querySelector('#dialog');
const initialConfig = await api('/api/config').catch(()=>null);
const localMode = initialConfig?.mode === 'local';
let cloud=null, cloudConfig=initialConfig, saving=false;
let state=emptyState(), lastRaw=null, storageBlocked=false;
try { if(localMode) { lastRaw=localStorage.getItem(KEY); if(lastRaw) state=validateState(JSON.parse(lastRaw)); } }
catch { storageBlocked=true; }
let demo=false, demoData=demoState(), page='today', selected=today(), month=today().slice(0,7), filter='', reviewDate=weekStart(today()), timer, codexTimer;
let projectedSource,projectedData;
const data=()=>{const source=demo?demoData:state;if(source!==projectedSource){projectedSource=source;projectedData={...source,records:projectRecords(source)};}return projectedData;};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const theme=id=>ALL_THEMES.find(t=>t.id===id);
const fmt=date=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(timer); timer=setTimeout(()=>el.classList.remove('show'),4500); }
async function update(change) {
  if(saving){toast('저장 중이에요. 잠시 기다려주세요.');return false;}
  saving=true;
  try {
    const next=structuredClone(demo?demoData:state); change(next);
    const checked=validateState(next);
    if(demo) demoData=checked;
    else if(cloud) {
      state=await cloud.save(checked,state);
    } else {
      if(!localMode) throw new Error('서버 연결을 확인해주세요.');
      if(storageBlocked) throw new Error('기존 저장 데이터를 읽지 못했어요. 설정에서 원본을 먼저 백업해주세요.');
      if(localStorage.getItem(KEY)!==lastRaw) throw new Error('다른 창에서 기록이 바뀌었어요. 입력 내용을 복사한 뒤 새로고침해주세요.');
      const raw=JSON.stringify(checked); if(lastRaw)localStorage.setItem(`${KEY}.before`,lastRaw); localStorage.setItem(KEY,raw); state=checked; lastRaw=raw;
    }
    return true;
  } catch(error) { toast(cloud ? error.message : '저장하지 못했어요. 입력을 보존하고 저장 공간·다른 창의 변경을 확인해주세요.'); if(cloud) render(); return false; } finally { saving=false; }
}
function flower(active=Array(THEMES.length).fill(false),className='',label='') {
  const stage=flowerStage(active);
  return `<img class="flower ${className}" src="/assets/flower-stage-${stage}.png" width="1254" height="1254" alt="${esc(label||'')}" ${label?'':'aria-hidden="true"'}>`;
}

const chips=ids=>ids.map(id=>`<span class="chip"><i style="background:${theme(id).color}"></i>${theme(id).name}</span>`).join('');
function calendar() {
  const dates=themesByDate(data().records), currentDate=today();
  const first=`${month}-01`, offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7;
  const days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
  return `<section class="card calendar"><div class="section-top"><div><h2>${Number(month.slice(0,4))}년 ${Number(month.slice(5))}월</h2></div><div class="arrows"><button data-action="month" data-delta="-1" aria-label="이전 달">‹</button><button data-action="month" data-delta="1" aria-label="다음 달">›</button></div></div><div class="weekdays">${['월','화','수','목','금','토','일'].map(w=>`<span>${w}</span>`).join('')}</div><div class="calendar-grid">${'<span></span>'.repeat(offset)}${Array.from({length:days},(_,i)=>{
    const date=`${month}-${String(i+1).padStart(2,'0')}`, flags=dates.get(date)||THEMES.map(()=>false), n=flags.filter(Boolean).length;
    const rest=data().rest.includes(date), future=date>currentDate;
    const names=THEMES.filter((_,j)=>flags[j]).map(t=>t.name).join(', ');
    return `<button class="day ${date===selected?'selected':''} ${date===currentDate?'is-today':''}" data-action="date" data-date="${date}" ${future?'disabled':''} aria-pressed="${date===selected}" aria-label="${esc(fmt(date))}, ${n?names+' 실천':rest?'쉬어감':'기록 없음'}"><span>${i+1}</span>${flower(flags)}${rest?'<small class="rest-dot" title="쉬어감">◡</small>':''}</button>`;
  }).join('')}</div></section>`;
}
// Wanted Montage IconTrash (MIT); see THIRD_PARTY_NOTICES.md.
const trashIcon="<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M9.99996 10.601C10.497 10.601 10.9 11.0039 10.9 11.501V16.501C10.9 16.9981 10.497 17.401 9.99996 17.401C9.50291 17.401 9.09996 16.9981 9.09996 16.501V11.501C9.09996 11.0039 9.50291 10.601 9.99996 10.601Z\" fill=\"currentColor\"/><path d=\"M14 10.601C14.497 10.601 14.8999 11.0039 14.8999 11.501V16.501C14.8999 16.9981 14.497 17.401 14 17.401C13.5029 17.401 13.1 16.9981 13.1 16.501V11.501C13.1 11.0039 13.5029 10.601 14 10.601Z\" fill=\"currentColor\"/><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M19.9999 5.85139H16.3998C16.3998 5.35069 16.3985 4.92216 16.3696 4.56761C16.3378 4.17845 16.2681 3.79986 16.0837 3.43792C15.8057 2.89225 15.362 2.44861 14.8164 2.17058C14.4544 1.98616 14.0758 1.91653 13.6867 1.88473C13.3163 1.85447 12.8651 1.85448 12.3353 1.85449H11.6644C11.1346 1.85448 10.6833 1.85447 10.3129 1.88473C9.92377 1.91653 9.54518 1.98616 9.18325 2.17058C8.63758 2.44861 8.19393 2.89225 7.9159 3.43792C7.73149 3.79986 7.66186 4.17845 7.63006 4.56761C7.60109 4.92216 7.59986 5.35069 7.59982 5.85139H3.99997C3.50292 5.85139 3.09998 6.25433 3.09998 6.75139C3.09998 7.24844 3.50292 7.65139 3.99997 7.65139H4.59987L4.59987 18.0878C4.59986 18.6176 4.59985 19.0688 4.63011 19.4392C4.66191 19.8284 4.73154 20.207 4.91595 20.5689C5.19399 21.1146 5.63763 21.5582 6.1833 21.8363C6.54523 22.0207 6.92382 22.0903 7.31298 22.1221C7.68338 22.1524 8.13453 22.1524 8.66434 22.1524H15.3352C15.8651 22.1524 16.3163 22.1524 16.6867 22.1221C17.0759 22.0903 17.4545 22.0207 17.8164 21.8363C18.3621 21.5582 18.8057 21.1146 19.0837 20.5689C19.2682 20.207 19.3378 19.8284 19.3696 19.4392C19.3999 19.0688 19.3998 18.6176 19.3998 18.0878V7.65139H19.9999C20.497 7.65139 20.8999 7.24844 20.8999 6.75139C20.8999 6.25433 20.497 5.85139 19.9999 5.85139ZM14.6002 5.85139H9.40017V5.54537C9.40017 4.73081 9.41127 4.53698 9.454 4.40545C9.56281 4.07057 9.82536 3.80802 10.1602 3.69921C10.2918 3.65648 10.4856 3.64537 11.3002 3.64537H12.7002C13.5147 3.64537 13.7086 3.65648 13.8401 3.69921C14.175 3.80802 14.4375 4.07057 14.5463 4.40545C14.589 4.53698 14.6002 4.73081 14.6002 5.54537V5.85139ZM6.4002 18.446V7.65139H17.6002V18.446C17.6002 19.2605 17.5891 19.4544 17.5463 19.5859C17.4375 19.9208 17.175 20.1833 16.8401 20.2921C16.7086 20.3349 16.5147 20.346 15.7002 20.346H8.30019C7.48563 20.346 7.2918 20.3349 7.16028 20.2921C6.82539 20.1833 6.56284 19.9208 6.45403 19.5859C6.4113 19.4544 6.4002 19.2605 6.4002 18.446Z\" fill=\"currentColor\"/></svg>";
function recordRow(r) {
  return `<article class="record-item"><strong class="record-item-text">${esc(r.summary||r.text)}</strong><div class="record-item-actions"><button data-action="edit" data-id="${esc(r.id)}" aria-label="기록 수정" title="수정">${pencilIcon}</button><button data-action="delete" data-id="${esc(r.id)}" aria-label="기록 삭제" title="삭제">${trashIcon}</button></div></article>`;
}
function groupTags(items) {
  return `<span class="group-tags">${[...new Set(items.flatMap(r=>r.themes))].map(id=>`<span class="pill" data-theme="${esc(id)}" style="--accent:${id==='money'?'var(--flower-orange)':theme(id).color}">${esc(theme(id).name)}</span>`).join('')}</span>`;
}
let arranging=false,pickedItem=null,workUndo=null;
const expandedGroups=new Set();
function arrangeList(records) {
  const ids=new Set(records.map(r=>r.groupId));
  const groups=data().groups.filter(g=>ids.has(g.id));
  const handle=(type,id)=>`<button class="drag-handle" data-drag-type="${type}" data-drag-id="${esc(id)}" data-action="arrange-pick" data-type="${type}" data-id="${esc(id)}" aria-label="${type==='group'?'묶음':'기록'} 옮기기" title="드래그하거나 눌러서 옮기기">⠿</button>`;
  return `<div class="arrange-list"><p class="quiet arrange-help">타일을 겹치면 합쳐져요. 클릭하면 안의 기록을 꺼낼 수 있어요.<br>손잡이를 누르고 목적지를 눌러도 옮길 수 있어요. 변경은 바로 저장돼요.</p>${pickedItem?'<p class="arrange-selection" role="status">놓을 묶음이나 꺼내기 영역을 선택해주세요. <button class="text-button" data-action="arrange-cancel">선택 취소</button></p>':''}${groups.map(g=>{
    const items=newestRecords(records.filter(r=>r.groupId===g.id)),open=expandedGroups.has(g.id);
    const source=pickedItem?.type==='group'?pickedItem.id:data().records.find(r=>r.id===pickedItem?.id)?.groupId;
    return `<section class="arrange-tile" data-drop-group="${esc(g.id)}"><div class="arrange-heading">${handle('group',g.id)}<button class="arrange-open" data-action="arrange-open" data-id="${esc(g.id)}" data-drag-type="group" data-drag-id="${esc(g.id)}" aria-expanded="${open}">${groupTags(items)}<strong>${esc(g.title||'해낸 일')}</strong><span class="count">${items.length}</span><span aria-hidden="true">${open?'⌃':'⌄'}</span></button></div>${pickedItem&&source!==g.id?`<button class="secondary full" data-action="arrange-drop" data-id="${esc(g.id)}">${pickedItem.type==='group'?'이 묶음에 합치기':'이 묶음으로 옮기기'}</button>`:''}${open?`<div class="arrange-items">${items.map(r=>`<div class="arrange-record" data-drag-type="record" data-drag-id="${esc(r.id)}">${handle('record',r.id)}<span>${esc(r.summary||r.text)}</span></div>`).join('')}<button class="text-button" data-action="group-add" data-id="${esc(items[0].id)}">＋ 기록 추가</button></div>`:''}</section>`;
  }).join('')}<button class="arrange-new" data-drop-group="" data-action="arrange-drop" data-id="">＋ 여기에 놓아 새 묶음으로 꺼내기</button></div>`;
}
async function arrangeDrop(item,targetId='') {
  if(saving||!arranging)return;
  const source=demo?demoData:state,before={groups:structuredClone(source.groups),records:structuredClone(source.records)};
  const destination=data().groups.find(g=>g.id===targetId),newId=crypto.randomUUID();
  const change=s=>{
    if(item.type==='group')mergeGroups(s,[targetId,item.id],destination?.title||'해낸 일');
    else moveGroupedRecord(s,item.id,targetId,newId);
  };
  try{change(structuredClone(source));}catch(error){toast(error.message);return;}
  if(!await update(change))return;
  // Store the intended result, not unrelated records merged in by another device.
  const after=structuredClone(before);change(after);
  workUndo={before,after,demo};pickedItem=null;
  if(item.type==='record')expandedGroups.add(targetId||newId);
  filter='';render();
  toast(targetId?'옮겼어요. 실행 취소로 되돌릴 수 있어요.':'새 묶음으로 꺼냈어요. 제목을 눌러 내용을 확인할 수 있어요.');
}
async function undoArrange() {
  if(!workUndo||workUndo.demo!==demo)return;
  const {before,after}=workUndo;
  try{restoreWork(structuredClone(demo?demoData:state),before,after);}catch(error){toast(error.message);workUndo=null;render();return;}
  if(!await update(s=>restoreWork(s,before,after)))return;
  workUndo=null;pickedItem=null;render();toast('이전 묶음으로 되돌렸어요.');
}
let groupDrag=null,suppressDragClick=false,dragScrollFrame=0;
function dragTarget(x,y) {
  const el=document.elementFromPoint(x,y)?.closest('[data-drop-group]');
  const item=groupDrag?.item;if(!el||!item)return null;
  const sourceId=item.type==='group'?item.id:data().records.find(r=>r.id===item.id)?.groupId;
  const targetId=el.dataset.dropGroup;
  if(targetId===sourceId||(!targetId&&(item.type!=='record'||data().records.filter(r=>r.groupId===sourceId).length<2)))return null;
  return el;
}
function paintDrag() {
  if(!groupDrag?.active)return;
  const {x,y,ghost}=groupDrag;
  const target=dragTarget(x,y);
  document.querySelectorAll('.drop-ready').forEach(el=>el.classList.remove('drop-ready'));
  target?.classList.add('drop-ready');
  const title=target?.dataset.dropGroup?data().groups.find(g=>g.id===target.dataset.dropGroup)?.title||'해낸 일':'';
  ghost.textContent=target?(title?`“${title}”에 ${groupDrag.item.type==='group'?'합치기':'옮기기'}`:'새 묶음으로 꺼내기'):'놓을 위치로 옮겨주세요';
  ghost.style.left=`${Math.max(8,Math.min(x+12,window.innerWidth-240))}px`;
  ghost.style.top=`${Math.max(8,Math.min(y+16,window.innerHeight-64))}px`;
}
function scrollDrag() {
  if(!groupDrag?.active)return;
  const y=groupDrag.y,delta=y<72?-10:y>window.innerHeight-72?10:0;
  if(delta){window.scrollBy(0,delta);paintDrag();}
  dragScrollFrame=requestAnimationFrame(scrollDrag);
}
function cancelGroupDrag() {
  const drag=groupDrag;groupDrag=null;cancelAnimationFrame(dragScrollFrame);
  drag?.ghost?.remove();drag?.element?.classList.remove('drag-source');
  document.querySelectorAll('.drop-ready').forEach(el=>el.classList.remove('drop-ready'));
  document.body.classList.remove('group-dragging');
  if(drag?.element?.hasPointerCapture(drag.pointerId))drag.element.releasePointerCapture(drag.pointerId);
}
document.addEventListener('pointerdown',event=>{
  if(!arranging||saving||dialog.open||event.button!==0||groupDrag)return;
  const element=event.target.closest('[data-drag-type]');if(!element)return;
  if(event.pointerType!=='mouse'&&!element.classList.contains('drag-handle'))return;
  groupDrag={element,pointerId:event.pointerId,item:{type:element.dataset.dragType,id:element.dataset.dragId},startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,active:false};
  element.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove',event=>{
  if(!groupDrag||groupDrag.pointerId!==event.pointerId)return;
  const drag=groupDrag;drag.x=event.clientX;drag.y=event.clientY;
  if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)<8)return;
  event.preventDefault();
  if(!drag.active){
    drag.active=true;suppressDragClick=true;drag.ghost=document.createElement('div');drag.ghost.className='drag-feedback';drag.ghost.setAttribute('aria-hidden','true');document.body.append(drag.ghost);
    drag.element.classList.add('drag-source');document.body.classList.add('group-dragging');scrollDrag();
  }
  paintDrag();
},{passive:false});
document.addEventListener('pointerup',event=>{
  if(!groupDrag||groupDrag.pointerId!==event.pointerId)return;
  const {item,active}=groupDrag,target=active?dragTarget(event.clientX,event.clientY):null,targetId=target?.dataset.dropGroup;
  cancelGroupDrag();
  if(active){setTimeout(()=>{suppressDragClick=false;},0);if(target)void arrangeDrop(item,targetId);}
});
document.addEventListener('pointercancel',()=>{cancelGroupDrag();suppressDragClick=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){cancelGroupDrag();pickedItem=null;suppressDragClick=false;if(arranging)render();}});
window.addEventListener('blur',()=>{cancelGroupDrag();suppressDragClick=false;});
document.addEventListener('click',event=>{if(suppressDragClick){event.preventDefault();event.stopImmediatePropagation();}},true);
document.addEventListener('dragstart',event=>{if(arranging&&event.target.closest('[data-drag-type]'))event.preventDefault();});

function recordsList(records) {
  if(arranging)return arrangeList(records);
  if(!records.length) return `<div class="empty"><span>아직 기록이 없어요.</span><p>이미 한 일이 있다면 한 줄만 적어보세요.</p></div>`;
  return sortedWorkGroups(records).map(([name,items])=>`<section class="work-group"><button class="work-group-open" data-action="group" data-id="${esc(items[0].id)}" aria-label="${esc(name||'해낸 일')} ${items.length}개 · 묶음 내역 보기"><span class="work-group-heading">${groupTags(items)}<strong class="work-group-title">${esc(name||'해낸 일')}</strong><span class="count">${items.length}</span><svg class="group-chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7.86337 3.36272C7.51189 3.7142 7.51189 4.28405 7.86337 4.63552L15.227 11.9991L7.86337 19.3627C7.51189 19.7142 7.51189 20.284 7.86337 20.6355C8.21484 20.987 8.78469 20.987 9.13616 20.6355L17.1362 12.6355C17.4876 12.284 17.4876 11.7142 17.1362 11.3627L9.13616 3.36272C8.78469 3.01125 8.21484 3.01125 7.86337 3.36272Z" fill="currentColor"/></svg></span></button></section>`).join('');
}
function groupItems(id) {
  const record=data().records.find(r=>r.id===id);if(!record)return [];
  return newestRecords(data().records.filter(r=>r.groupId===record.groupId&&(r.date===selected&&(!filter||r.themes.includes(filter)))));
}
let groupEditor=null;
const pencilIcon='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.9888 3.82177C17.1457 2.66488 19.0213 2.66488 20.1782 3.82177C21.3351 4.97866 21.3351 6.85434 20.1782 8.01122L7.55327 20.6362C7.38448 20.805 7.15557 20.8998 6.91687 20.8998H4.00022C3.50316 20.8998 3.10022 20.4969 3.10022 19.9998V17.0832C3.10022 16.8445 3.19504 16.6155 3.36382 16.4468L15.9888 3.82177ZM18.9054 5.09456C18.4515 4.64062 17.7155 4.64062 17.2616 5.09456L4.90021 17.456V19.0998H6.54408L18.9054 6.73843C19.3594 6.28449 19.3594 5.5485 18.9054 5.09456Z" fill="currentColor"/></svg>';
function groupDetail(id) {
  const items=groupItems(id);if(!items.length)return;
  const record=items[0];
  const themeIds=[...new Set(items.flatMap(r=>r.themes))],initialTheme=themeIds.length===1&&THEMES.some(t=>t.id===themeIds[0])?themeIds[0]:'';
  showDialog(`${closeButton}<div class="group-title-line"><h2 id="group-title-heading"><span id="group-title-label">${esc(record.group||'해낸 일')}</span> <span class="count">${items.length}</span></h2><button id="group-title-edit" aria-label="묶음 제목 수정">${pencilIcon}</button><div id="group-title-editor" hidden><input id="group-title-input" aria-label="묶음 제목" maxlength="80" value="${esc(record.group||'')}" hidden><button id="group-title-save" class="primary" type="button">저장</button></div></div>${themeIds.length>1?`<p class="quiet" id="group-multiple-themes">현재 테마: ${themeIds.map(id=>esc(theme(id).name)).join(' · ')}<br>아래에서 하나를 고르면 묶음 전체의 테마가 바뀌어요.</p>`:''}<fieldset id="group-theme" class="theme-picker"><legend class="sr-only">묶음 테마</legend>${THEMES.map(t=>`<label style="--accent:${t.color}"><input type="radio" name="group-theme" value="${t.id}" ${initialTheme===t.id?'checked':''}><span>${themeIcons[t.id]}${t.name}</span></label>`).join('')}</fieldset><div class="inline-actions"><button class="primary" data-action="group-add" data-id="${esc(record.id)}">기록 추가</button>${items.length>1?`<button class="secondary" data-action="group-split" data-id="${esc(record.id)}">기록 분리하기</button>`:''}</div><div class="group-history">${items.map(r=>recordRow(r)).join('')}</div>`);
  const input=dialog.querySelector('#group-title-input'),label=dialog.querySelector('#group-title-label'),select=dialog.querySelector('#group-theme');
  const heading=dialog.querySelector('#group-title-heading'),editor=dialog.querySelector('#group-title-editor'),edit=dialog.querySelector('#group-title-edit'),save=dialog.querySelector('#group-title-save');
  let storedName=record.group||'',storedTheme=initialTheme,pending=Promise.resolve(true);
  const paintTheme=()=>{select.querySelectorAll('input').forEach(input=>{input.checked=input.value===storedTheme;});};
  const patch=async values=>update(s=>patchGroup(s,record.groupId,values));
  const saveTitle=()=>pending=pending.then(async()=>{
    if(input.hidden)return true;
    const name=input.value.trim();input.disabled=true;save.disabled=true;
    const ok=name===storedName||await patch({title:name});input.disabled=false;save.disabled=false;
    if(!ok){input.focus();return false;}
    storedName=name;label.textContent=name||'해낸 일';input.hidden=true;editor.hidden=true;heading.hidden=false;edit.hidden=false;render();return true;
  });
  groupEditor={saveTitle};
  edit.onclick=()=>{heading.hidden=true;edit.hidden=true;editor.hidden=false;input.hidden=false;input.focus();input.select();};
  save.onclick=saveTitle;
  input.onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();void saveTitle();}};
  select.onchange=event=>{
    const value=event.target.value;
    if(!THEMES.some(t=>t.id===value)||value===storedTheme)return;
    select.disabled=true;
    pending=pending.then(async()=>{
      const ok=await patch({themes:[value]});
      if(ok){storedTheme=value;dialog.querySelector('#group-multiple-themes')?.remove();filter='';render();}
      paintTheme();select.disabled=false;return ok;
    });
  };
}
async function closeDialog() {
  if(groupEditor){if(!await groupEditor.saveTitle())return;groupEditor=null;}
  if(!saving)dialog.close();
}
function daily() {
  const flags=activeThemes(data().records,selected), total=flags.filter(Boolean).length;
  const records=data().records.filter(r=>r.date===selected&&(!filter||r.themes.includes(filter)));
  const rest=data().rest.includes(selected), isToday=selected===today();
  return `<div class="page-heading${mobileDevice?' mobile-day-heading':''}"><div><h1 class="date-heading"><time datetime="${selected}">${selected.replaceAll('-','.')} ${new Intl.DateTimeFormat('ko-KR',{weekday:'long',timeZone:'UTC'}).format(new Date(`${selected}T12:00:00Z`))}</time></h1></div><div class="heading-actions"><button class="${mobileDevice?'primary':'secondary'}" data-action="record">${mobileDevice?'직접 기록':'직접 기록하기'}</button>${mobileDevice?'':`<button class="primary" data-action="codex">${isToday?'오늘':'이날'} 한 일 가져오기</button>`}</div></div><div class="dashboard"><div class="daily-column">${checkinsPanel()}<section class="bloom-card"><div class="bloom-head"><span class="pill">${isToday?'오늘의 꽃':'이날의 꽃'}</span><span class="quiet">${rest?'쉬어가는 날':total?`${total}단계 · ${total}개 테마 실천`:'0단계 · 아직 기록 없음'}</span></div><div class="hero-flower">${flower(flags,'',`${total}개 테마 실천`)}</div><h2>${total?'잘했어요! 해낸 일이 쌓이고 있어요.':rest?'오늘은 편하게 쉬어요.':'이미 한 일이 있나요?'}</h2><p>${total?'아래 도장에서 어떤 일을 했는지 확인해요.':rest?'나중에 기록하고 싶을 때 다시 와도 돼요.':mobileDevice?'직접 기록해보세요.':'Codex에서 가져오거나 직접 기록해보세요.'}</p><div class="stamps">${THEMES.map((t,i)=>`<button class="stamp ${flags[i]?'done':''} ${filter===t.id?'active':''}" data-action="filter" data-theme="${t.id}" style="--accent:${t.color}" aria-pressed="${filter===t.id}" aria-label="${t.name} ${flags[i]?'완료':'기록 없음'}, 기록 보기"><span class="stamp-shape">${flags[i]?stampCheck:themeIcons[t.id]}</span><strong>${t.name}</strong></button>`).join('')}</div></section>
    <section class="card records"><div class="section-top"><h2>${filter?theme(filter).name+'의 기록':'이날 해낸 일'} <span class="count">${records.length}</span></h2>${filter?'<button class="text-button" data-action="clear-filter">전체 보기</button>':''}${data().records.some(r=>r.date===selected)?'':`<button class="text-button" data-action="rest">${rest?'쉬어감 취소':'오늘은 쉬어가기'}</button>`}${records.length?`<div class="arrange-toolbar"><button class="text-button" data-action="arrange-toggle">${arranging?'편집 완료':'편집'}</button>${arranging&&workUndo?'<button class="text-button" data-action="arrange-undo">실행 취소</button>':''}</div>`:''}</div>${recordsList(records)}</section></div><aside>${calendar()}</aside></div>`;
}
function regroupForm(id) {
  const items=groupItems(id);if(items.length<2)return;
  showDialog(`${closeButton}<h2>기록 분리하기</h2><p class="quiet">선택한 기록을 새 묶음으로 옮겨요. 날짜와 테마는 유지돼요.</p><form id="regroup-form"><fieldset class="group-selection"><legend>분리할 기록</legend>${items.map(r=>`<label><input type="checkbox" name="selection" value="${esc(r.id)}"><span>${esc(r.summary||r.text)}</span></label>`).join('')}</fieldset><label for="regroup-title">새 묶음 이름</label><input id="regroup-title" name="title" maxlength="80" required><p class="form-error" role="alert"></p><div class="inline-actions"><button type="button" class="secondary" id="regroup-cancel">취소</button><button class="primary">선택한 기록 분리하기</button></div></form>`);
  dialog.querySelector('#regroup-cancel').onclick=()=>groupDetail(id);
  dialog.querySelector('#regroup-form').onsubmit=async event=>{
    event.preventDefault();
    const form=event.currentTarget,fd=new FormData(form),ids=fd.getAll('selection'),title=fd.get('title').trim(),newId=crypto.randomUUID();
    const change=s=>splitGroup(s,items[0].groupId,ids,title,newId);
    try{change(structuredClone(demo?demoData:state));}catch(error){form.querySelector('.form-error').textContent=error.message;return;}
    if(!await update(change))return;
    filter='';render();groupDetail(ids[0]);toast('선택한 기록을 새 묶음으로 옮겼어요.');
  };
}
function futurePage() {
  return `<div class="page-heading"><div><h1>10년 뒤, 어떤 하루일까요?</h1></div></div><form id="future-form"><div class="future-grid">${THEMES.map((t,i)=>`<section class="card future-card"><div class="future-theme"><span class="future-theme-mark" style="color:${t.color}">${themeIcons[t.id]}</span><h2>${t.name}</h2></div><textarea aria-label="${t.name}에서 바라는 나의 모습" id="future-${t.id}" name="${t.id}" maxlength="1000" placeholder="예: ${t.future}">${esc(data().futures[t.id]||'')}</textarea></section>`).join('')}</div><div class="save-row"><button class="primary">내 미래 저장하기</button></div></form>`;
}
function reviewPage() {
  const summary=weekSummary(data().records,reviewDate), review=data().reviews[reviewDate]||{mood:'',note:''};
  return `<div class="page-heading"><div><h1>이번 주에 한 일을 확인해볼까요?</h1><p>${fmt(reviewDate)} — ${fmt(shiftDate(reviewDate,6))}</p></div><div class="arrows"><button data-action="week" data-delta="-7" aria-label="이전 주">‹</button><button data-action="week" data-delta="7" aria-label="다음 주" ${reviewDate>=weekStart(today())?'disabled':''}>›</button></div></div><section class="card weekly"><div class="weekly-flowers">${Array.from({length:7},(_,i)=>{const date=shiftDate(reviewDate,i);return `<button data-action="date" data-date="${date}" ${date>today()?'disabled':''}><span>${['월','화','수','목','금','토','일'][i]}</span>${flower(activeThemes(data().records,date))}<small>${date.slice(5).replace('-','.')}</small></button>`;}).join('')}</div><h2>${summary.days?`이번 주 ${summary.days}일 실천했어요. 잘했어요!`:'아직 이 주에 남긴 기록이 없어요.'}</h2><p>빠뜨린 일이 있다면 날짜를 눌러 추가해요.</p><div class="week-stats">${summary.themes.map(t=>`<div><i style="background:${t.color}"></i><span>${t.name}</span><strong>${t.days}일</strong></div>`).join('')}</div></section><div class="review-grid"><section class="card"><h2>이번 주에 남긴 것</h2>${summary.entries.length?`<ul class="outcomes">${[...new Set(summary.entries.map(r=>r.date))].sort().reverse().flatMap(date=>sortedWorkGroups(summary.entries.filter(r=>r.date===date))).map(([name,items])=>`<li><span>${items[0].date.slice(5).replace('-','.')}</span><div><strong>${esc(name||'해낸 일')}</strong>${items.flatMap(r=>[r.text,r.result]).filter(text=>text&&text!==name).map(text=>`<p>${esc(text)}</p>`).join('')}</div></li>`).join('')}</ul>`:'<p class="quiet">조사와 준비, 연습도 실제로 한 일이라면 남겨주세요.</p>'}</section><form id="review-form" class="card"><h2>이번 주의 양은 어땠어요?</h2><p class="quiet">다음 주를 재촉하지 않고, 내 페이스를 알아가요.</p><fieldset class="moods"><legend class="sr-only">체감 부담</legend>${['여유 있었어','적당했어','버거웠어'].map(m=>`<label><input type="radio" name="mood" value="${m}" ${review.mood===m?'checked':''}><span>${m}</span></label>`).join('')}</fieldset><label for="review-note">남기고 싶은 이야기</label><textarea id="review-note" name="note" maxlength="2000" placeholder="잘했던 일, 버거웠던 사정, 다음에 이어가고 싶은 것…">${esc(review.note)}</textarea><button class="primary">회고 저장하기</button><p class="footnote">실제 기록을 모은 회고예요. AI 분석은 아직 연결하지 않았어요.</p></form></div>`;
}
function settingsPage() {
  if(cloud)return cloudSettings();
  return `<div class="page-heading"><div><h1>기록과 알림을 설정해요.</h1></div></div><div class="settings-grid"><section class="card"><span class="pill">이 기기에서 사용 중</span><h2>나의 기록 보관</h2>${mobileDevice?'':`<button class="text-button" data-action="codex-settings">이 컴퓨터의 Codex 연결 설정</button>`}<p>지금은 이 브라우저에 저장돼요. 브라우저 데이터를 지우기 전에 백업해주세요. 다른 기기와 자동으로 동기화되지는 않아요.</p><div class="inline-actions"><button class="secondary" data-action="export">기록 백업하기 ↓</button><label class="secondary file-label">백업 가져오기<input type="file" id="import-file" accept="application/json,.json"></label></div>${storageBlocked?'<p class="error">기존 저장 데이터를 읽지 못해 덮어쓰기를 막았어요. 먼저 원본을 백업해주세요.</p><button data-action="raw-export">원본 데이터 다운로드</button>':''}</section><section class="card"><h2>하루를 챙기는 알림</h2><p>로컬 버전에서는 보미가 열려 있는 동안에만 알림을 확인해요. 앱을 닫아도 오는 푸시는 아직 연결 전이에요.</p><form id="reminder-form"><label for="reminder-time">알림 받을 시각 · 한국시간</label><input type="time" id="reminder-time" name="time" value="${esc(data().reminder)}"><div class="inline-actions"><button class="primary">시각 저장</button><button type="button" data-action="reminder-off">끄기</button><button type="button" data-action="notification-test">알림 테스트</button></div></form><p class="footnote">쉬어가거나 이미 기록한 날에는 재촉하지 않아요.</p></section></div>`;
}
function render() {
  const views={today:daily,routines:routinePage,future:futurePage,review:reviewPage,settings:settingsPage};
  app.innerHTML=`<a class="skip" href="#main">본문으로 이동</a><aside class="sidebar"><a class="brand" href="#" data-action="nav" data-page="today"><img src="/assets/bomi-logo.png" alt="보미" width="1981" height="724"></a><nav aria-label="주 메뉴">${[['today','오늘의 보미'],['routines','내 루틴 관리'],['future','나의 미래'],['review','주간 회고'],['settings','설정']].map(([id,name])=>`<button data-action="nav" data-page="${id}" class="${page===id?'current':''}" ${page===id?'aria-current="page"':''}><span aria-hidden="true">${navIcons[id]}</span>${name}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="small-flower">${flower([false,true,false])}</div><p>하나만 해볼까요?</p><button class="demo-button" data-action="demo">${demo?'내 기록으로 돌아가기':'예시로 둘러보기 ↗'}</button></div></aside><div class="workspace">${demo?'<div class="banner">예시 모드예요. 아래 기록은 실제 활동이 아니며 저장되지 않아요. <button data-action="demo">내 기록으로 돌아가기</button></div>':''}${cloud && !demo ? cloudBanner() : ''}${storageBlocked?'<div class="banner error">저장 데이터를 읽지 못했어요. 설정에서 원본을 백업해주세요.</div>':''}<div id="codex-notice"></div><main id="main">${views[page]()}</main></div>`;

}
let backdropPress=false;
function outsideDialog(event) {
  const box=dialog.getBoundingClientRect();
  return event.target===dialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom);
}
dialog.addEventListener('pointerdown',event=>{backdropPress=outsideDialog(event);});
dialog.addEventListener('pointercancel',()=>{backdropPress=false;});
dialog.addEventListener('click',event=>{
  if(backdropPress&&outsideDialog(event))void closeDialog();
  backdropPress=false;
});
dialog.addEventListener('cancel',event=>{event.preventDefault();void closeDialog();});
dialog.addEventListener('close',()=>{if(groupEditor){const editor=groupEditor;void editor.saveTitle().then(ok=>{if(groupEditor!==editor)return;if(ok)groupEditor=null;else dialog.showModal();});}});
function showDialog(html) { groupEditor=null; clearTimeout(codexTimer); delete dialog.dataset.codex; dialog.setAttribute('aria-label','보미 기록과 확인'); dialog.innerHTML=html; if(!dialog.open) dialog.showModal(); }
const closeButton='<button type="button" class="close" data-action="close" aria-label="닫기">×</button>';
function recordForm(id='',preferred='',groupId='') {
  const record=id?data().records.find(r=>r.id===id):null;
  if(id&&!record)return;
  const group=groupId?data().groups.find(g=>g.id===groupId):null;
  if(groupId&&!group)return;
  const choices=[...THEMES,...ALL_THEMES.filter(t=>record?.themes.includes(t.id)&&!THEMES.some(active=>active.id===t.id))];
  showDialog(`${closeButton}<h2>${record?'기록 다듬기':'한 일을 한 줄로 적어볼까요?'}</h2><form id="record-form" data-id="${esc(id)}" data-group-id="${esc(groupId)}">${group?`<p class="quiet">${esc(group.title||'해낸 일')} · ${esc(fmt(group.date))}</p><div class="chips">${chips(group.themes)}</div>`:''}${record||group?'':`<fieldset class="theme-picker"><legend>관련된 테마를 직접 골라주세요</legend>${choices.map(t=>`<label style="--accent:${t.color}"><input type="checkbox" name="themes" value="${t.id}" ${(record?.themes||[preferred]).includes(t.id)?'checked':''}><span>${themeIcons[t.id]||esc(t.mark)}${t.name}</span></label>`).join('')}</fieldset>`}<label for="record-summary">목록에 보일 한 줄 <span class="quiet">선택</span></label><input id="record-summary" name="summary" maxlength="80" placeholder="예: 블로그 글을 임시저장했다" value="${esc(record?.summary||'')}"><label for="record-text">실제로 한 일 · 상세</label><textarea id="record-text" name="text" maxlength="1000" required placeholder="예: 준비하던 글의 제목을 다듬었어">${esc(record?.text||'')}</textarea>${record||group?'':`<label for="record-group">작업 묶음 <span class="quiet">선택</span></label><input id="record-group" name="group" maxlength="80">`}<div class="form-error" role="alert"></div><div class="inline-actions record-form-actions"><button type="button" class="secondary" id="cancel-record">취소</button><button class="primary" id="save-record" disabled>저장</button></div></form>`);
  const form=dialog.querySelector('#record-form'),save=form.querySelector('#save-record');
  const snapshot=()=>JSON.stringify([...new FormData(form)]);
  const original=snapshot();
  const updateSave=()=>{save.disabled=snapshot()===original;};
  form.addEventListener('input',updateSave);
  form.addEventListener('change',updateSave);
  form.querySelector('#cancel-record').onclick=()=>{if(record)groupDetail(record.id);else if(group)groupDetail(data().records.find(r=>r.groupId===group.id)?.id);else void closeDialog();};
}
async function saveRecord(record,groupId='') {
    if(saving)return;
    const editing=data().records.some(r=>r.id===record.id);
    const duplicate=data().records.some(r=>r.id!==record.id&&r.date===record.date&&r.text===record.text&&[...r.themes].sort().join() === [...record.themes].sort().join());
    if(duplicate){toast('같은 날짜에 같은 기록이 있어요. 기존 기록을 확인해주세요.');return;}
    if(!await update(s=>{if(groupId&&!s.groups.some(g=>g.id===groupId))throw new Error('묶음이 변경됐어요. 다시 열어주세요.');putRecord(s,record,groupId);}))return;
    selected=record.date;month=selected.slice(0,7);filter='';page='today';render();
    if(editing||groupId){groupDetail(record.id);toast(editing?'수정한 내용을 저장했어요.':'묶음에 해낸 일을 추가했어요.');return;}
    const future=record.themes.map(id=>data().futures[id]).find(Boolean);
    showDialog(`${closeButton}<div class="celebration">${flower(activeThemes(data().records,selected),'pop')}<h2>잘했어요! 해낸 일을 기록했어요.</h2><p class="celebration-text">${esc(record.text)}</p><div class="chips">${chips(record.themes)}</div><p class="quiet">${future?`바라던 모습: “${esc(future)}”<br>선택한 테마에 실제 한 일을 남겼어요.`:'직접 해낸 일이에요. 나중에 다시 확인할 수 있어요.'}</p><button class="primary full" data-action="close">내 꽃 보러 가기</button></div>`);
}
function download(value,name) { const blob=new Blob([value],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
// shortcut: 열린 페이지에서만 알림을 검사한다. 닫힌 앱 알림은 서버 푸시 연결이 필요하다.
async function reminderCheck() {
  if(!localMode)return;
  if(demo||storageBlocked||!state.reminder||state.rest.includes(today())||state.groups.some(g=>g.date===today())||state.snoozed[today()]>Date.now())return;
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  if(time<state.reminder)return;
  if(!await update(s=>s.snoozed[today()]=Date.now()+24*60*60*1000))return;
  if('Notification'in window&&Notification.permission==='granted') {const n=new Notification('보미 · 하나만 해볼까요?',{body:'오늘 해낸 일 하나만 같이 남겨볼까요?',icon:'/assets/flower-stage-3.png'});n.onclick=()=>{window.focus();selected=today();recordForm();n.close();};}
  toast('보미가 왔어요. 오늘 해낸 일 하나만 같이 남겨볼까요?');
}
async function action(event) {
  const button=event.target.closest('[data-action]');if(!button)return;
  event.preventDefault();const kind=button.dataset.action,id=button.dataset.id;
  if(kind.startsWith('routine-')||kind==='checkin'||kind==='checkin-edit'){await routineAction(kind,id);return;}
  if(kind==='close'){await closeDialog();return;}
  if(groupEditor&&!await groupEditor.saveTitle())return;
  if(saving){toast('저장 중이에요. 잠시 기다려주세요.');return;}
  if(kind.startsWith('cloud-')){await cloudAction(kind);return;}
  if(kind==='nav'){page=button.dataset.page;render();window.scrollTo({top:0});return;}
  if(kind==='demo'){arranging=false;workUndo=null;pickedItem=null;expandedGroups.clear();demo=!demo;page='today';selected=today();month=selected.slice(0,7);filter='';render();return;}
  if(kind==='codex-notice-dismiss'){dismissCodexNotice();return;}
  if(kind==='codex'){await collectCodex();return;}
  if(kind==='codex-settings'){await codexSettings();return;}
  if(kind==='record'){recordForm('',filter);return;}
  if(kind==='arrange-toggle'){arranging=!arranging;expandedGroups.clear();pickedItem=null;render();return;}
  if(kind==='arrange-undo'){await undoArrange();return;}
  if(kind==='arrange-open'){expandedGroups.has(id)?expandedGroups.delete(id):expandedGroups.add(id);render();return;}
  if(kind==='arrange-pick'){pickedItem={type:button.dataset.type,id};render();document.querySelector('[data-action="arrange-drop"]')?.focus();return;}
  if(kind==='arrange-cancel'){pickedItem=null;render();return;}
  if(kind==='arrange-drop'){if(pickedItem)await arrangeDrop(pickedItem,id);return;}
  if(kind==='group'){groupDetail(id);return;}
  if(kind==='group-split'){regroupForm(id);return;}
  if(kind==='group-add'){const record=data().records.find(r=>r.id===id);if(record)recordForm('','',record.groupId);return;}
  if(kind==='edit'){recordForm(id);return;}
  if(kind==='filter'){filter=filter===button.dataset.theme?'':button.dataset.theme;render();return;}
  if(kind==='clear-filter'){filter='';render();return;}
  if(kind==='date'){arranging=false;pickedItem=null;expandedGroups.clear();selected=button.dataset.date;month=selected.slice(0,7);page='today';filter='';render();return;}
  if(kind==='month'){const d=new Date(`${month}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+Number(button.dataset.delta));month=d.toISOString().slice(0,7);render();return;}
  if(kind==='week'){reviewDate=shiftDate(reviewDate,Number(button.dataset.delta));render();return;}
  if(kind==='rest'){if(await update(s=>{s.rest=s.rest.includes(selected)?s.rest.filter(d=>d!==selected):[...s.rest,selected];})){render();toast(data().rest.includes(selected)?'쉬어가는 날로 남겼어요. 기존 기록은 그대로예요.':'쉬어감 표시를 취소했어요.');}return;}
  if(kind==='delete'){
    showDialog(`${closeButton}<h2>이 기록을 삭제할까요?</h2><p>해당 테마의 마지막 기록이면 도장과 꽃 단계도 함께 바뀌어요.</p><div class="inline-actions"><button data-action="close" class="secondary">취소</button><button id="confirm-delete" class="danger">기록 삭제</button></div>`);
    document.querySelector('#confirm-delete').onclick=async()=>{if(await update(s=>s.records=s.records.filter(r=>r.id!==id))){dialog.close();render();toast('기록을 삭제했어요.');}};return;
  }
  if(kind==='export'){download(JSON.stringify(demo?demoData:state,null,2),`bomi-${demo?'example-':''}${today()}.json`);return;}
  if(kind==='raw-export'){download(lastRaw||'null',`bomi-original-${today()}.json`);return;}
  if(kind==='reminder-off'){if(await update(s=>s.reminder='')){render();toast('알림을 껐어요.');}return;}
  if(kind==='notification-test'){
    if(!('Notification'in window)){toast('이 브라우저는 시스템 알림을 지원하지 않아요.');return;}
    try {const permission=await Notification.requestPermission();if(permission==='granted')new Notification('보미의 테스트 알림',{body:'오늘 한 일 하나만 기록해볼까요?',icon:'/assets/flower-stage-3.png'});else toast('알림 권한이 허용되지 않았어요.');}catch{toast('이 환경에서는 시스템 알림을 사용할 수 없어요.');}return;
  }
}
document.addEventListener('click',action);
document.addEventListener('submit',async event=>{
  const form=event.target;event.preventDefault();const fd=new FormData(form);
  if(['routine-form','checkin-form'].includes(form.id)){await routineSubmit(form,fd);return;}
  if(form.id==='record-form') {
    if(form.querySelector('#save-record')?.disabled)return;
    try { const old=data().records.find(r=>r.id===form.dataset.id),group=form.dataset.groupId?data().groups.find(g=>g.id===form.dataset.groupId):null;if(form.dataset.groupId&&!group)throw new Error('묶음이 변경됐어요. 다시 열어주세요.');const record=validateRecord({id:old?.id||crypto.randomUUID(),date:old?.date||group?.date||selected,text:fd.get('text'),summary:fd.get('summary'),group:old?old.group:group?group.title:fd.get('group'),result:old?.result||'',themes:old?old.themes:group?group.themes:fd.getAll('themes'),saved:old?.saved||false},today(),!!old);await saveRecord(record,group?.id); }
    catch(error){form.querySelector('.form-error').textContent=error.message;}return;
  }
  if(form.id==='future-form'){if(await update(s=>{for(const t of THEMES)s.futures[t.id]=fd.get(t.id).trim();})){toast('바라는 미래를 저장했어요.');}return;}
  if(form.id==='review-form'){if(await update(s=>s.reviews[reviewDate]={mood:fd.get('mood')||'',note:fd.get('note').trim()}))toast('이번 주의 이야기를 저장했어요.');return;}
  if(form.id==='reminder-form'){if(await update(s=>{s.reminder=fd.get('time');delete s.snoozed[today()];}))toast(fd.get('time')?(cloud?'시각을 저장했어요. 이 기기의 알림 받기도 켜주세요.':'보미가 열려 있을 때 이 시각부터 알림을 확인할게요.'):'알림을 껐어요.');return;}
});
document.addEventListener('change',async event=>{
  if(event.target.id!=='import-file')return;
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>10*1024*1024)throw new Error('10MB 이하의 백업 파일을 선택해주세요.');
    const incoming=validateState(JSON.parse(await file.text()));
    showDialog(`${closeButton}<h2>백업 ${incoming.records.length}건을 가져올까요?</h2><p>현재 기록을 자동으로 백업한 다음, 선택한 파일의 내용으로 바꿔요.</p><div class="inline-actions"><button data-action="close" class="secondary">취소</button><button id="confirm-import" class="primary">백업하고 가져오기</button></div>`);
    document.querySelector('#confirm-import').onclick=async()=>{
      download(storageBlocked?lastRaw:JSON.stringify(demo?demoData:state,null,2),`bomi-before-import-${today()}.json`);
      if(storageBlocked){toast('읽지 못한 원본은 보존했어요. 복구를 확인하기 전에는 교체하지 않아요.');return;}
      if(await update(s=>Object.assign(s,incoming))){dialog.close();render();toast('백업을 가져왔어요.');}
    };
  } catch(error) {toast(error instanceof SyntaxError?'JSON 백업 파일을 확인해주세요.':error.message);}
  event.target.value='';
});
window.addEventListener('storage',event=>{if(event.key===KEY){toast('다른 창의 변경이 있어요. 입력 중인 내용이 없다면 새로고침해주세요.');}});
const weekdays=['일','월','화','수','목','금','토'];
function routinePage() {
  const routines=data().routines;
  return `<div class="page-heading"><div><h1>내 루틴 관리</h1></div><button class="primary" data-action="routine-new">루틴 추가하기</button></div><div class="routine-list">${routines.map(r=>`<section class="card routine-card"><div class="section-top"><h2>${esc(r.title)}</h2>${r.themes.length?groupTags([r]):'<span class="count">테마 미선택</span>'}</div><p class="routine-schedule">${esc(routineTime(r.time))}</p><div class="routine-weekdays" aria-label="알림 요일">${r.days.slice().sort((a,b)=>a-b).map(d=>`<span class="count">${weekdays[d]}</span>`).join('')}</div><div class="inline-actions"><button class="secondary" data-action="routine-edit" data-id="${r.id}">일정 수정하기</button><div class="routine-notification"><span>알림</span><button type="button" class="routine-switch" role="switch" aria-checked="${r.enabled}" aria-label="${esc(r.title)} 알림" data-action="routine-toggle" data-id="${r.id}"><span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span></button></div></div></section>`).join('')}</div>`;
}
function routineThemes(ids=[]) {
  return `<fieldset class="theme-picker"><legend>완료 기록에 연결할 테마</legend>${THEMES.map(t=>`<label><input type="checkbox" name="themes" value="${t.id}" ${ids.includes(t.id)?'checked':''}><span style="--accent:${t.color}">${themeIcons[t.id]}${t.name}</span></label>`).join('')}</fieldset>`;
}
function checkinsPanel() {
  const due=selected===today()?routineDue(data()):[];
  if(!due.length)return '';
  return `<section class="card" id="checkins"><div class="section-top"><h2>보미가 물어봐요</h2><button class="text-button" data-action="nav" data-page="routines">내 루틴 관리</button></div>${due.map(r=>`<article class="record"><div class="record-body"><h3>${esc(r.title)}</h3><p>${r.kind==='bedtime'?'지난밤 몇 시에 누웠나요?': '할 시간이 되었어요. 했는지 알려주세요.'}</p><button class="secondary" data-action="checkin" data-id="${r.id}">답변하기</button></div></article>`).join('')}<p class="footnote">완료 답변은 보미 기록에 바로 추가돼요. 답변하지 않아도 미완료로 단정하지 않아요.</p></section>`;
}
function routineForm(id='') {
  const r=data().routines.find(r=>r.id===id)||{title:'',kind:'activity',days:[0,1,2,3,4,5,6],time:'',enabled:true};
  showDialog(`${closeButton}<h2>${id?'일정 수정하기':'루틴 추가하기'}</h2><form id="routine-form" data-id="${esc(id)}"><label for="routine-title">루틴 이름</label><input id="routine-title" name="title" maxlength="100" required value="${esc(r.title)}"><label for="routine-memo">메모</label><textarea id="routine-memo" name="memo" maxlength="500" placeholder="간단한 메모를 남겨주세요.">${esc(r.memo||'')}</textarea><fieldset class="routine-days"><legend>요일</legend>${weekdays.map((d,i)=>`<label><input type="checkbox" name="days" value="${i}" ${r.days.includes(i)?'checked':''}>${d}</label>`).join('')}</fieldset><label for="routine-time">물어볼 시각 · 한국시간</label><input type="time" id="routine-time" name="time" value="${r.time}" required>${routineThemes(r.themes)}<div class="form-error" role="alert"></div><button class="primary">일정 저장하기</button></form>`);
}
function checkinForm(id, key='') {
  const old=key?data().checkins.find(a=>a.key===key):null;
  const r=old?{id:old.routineId,title:old.title,kind:old.before?'bedtime':'activity',before:old.before}:routineDue(data()).find(r=>r.id===id);
  if(!r)return;
  const date=old?.date||today();
  showDialog(`${closeButton}<h2>${esc(r.title)}</h2><form id="checkin-form" data-routine="${r.id}" data-date="${date}" data-title="${esc(r.title)}" data-before="${r.before||''}">${r.kind==='bedtime'?`<label for="bedtime">지난밤 실제로 누운 날짜와 시각</label><input id="bedtime" type="datetime-local" name="bedtime" value="${old?.bedtime||''}" min="${shiftDate(date,-1)}T00:00" max="${date}T23:59"><p>${esc(shiftDate(date,-1))} 밤부터 ${date} 새벽을 확인해요. 기준은 ${date} ${r.before} 전이에요.</p><label><input type="radio" name="answer" value="bedtime" ${old?.answer!=='skip'?'checked':''}> 시각 기록</label>`:`<label><input type="radio" name="answer" value="done" ${old?.answer!=='skip'?'checked':''}> 했어요</label>`}<label><input type="radio" name="answer" value="skip" ${old?.answer==='skip'?'checked':''}> 오늘은 건너뛸게요</label>${data().routines.find(item=>item.id===r.id)?.themes.length?data().routines.find(item=>item.id===r.id).themes.map(t=>`<input type="hidden" name="themes" value="${t}">`).join(''):routineThemes()}<div class="form-error" role="alert"></div><button class="primary">답변 저장</button></form>`);
}
async function routineAction(kind,id) {
  if(kind==='routine-new'){routineForm();return;}
  if(kind==='routine-edit'){routineForm(id);return;}
  if(kind==='routine-toggle'){if(await update(s=>{const r=s.routines.find(r=>r.id===id);r.enabled=!r.enabled;}))render();return;}
  if(kind==='checkin'){checkinForm(id);return;}
  if(kind==='checkin-edit')checkinForm('',id);
}
async function routineSubmit(form,fd) {
  try {
    if(form.id==='routine-form') {
      const old=data().routines.find(r=>r.id===form.dataset.id);
      const r=validateRoutine({id:old?.id||crypto.randomUUID(),title:fd.get('title'),kind:'activity',days:fd.getAll('days').map(Number),time:fd.get('time'),memo:fd.get('memo'),enabled:old?.enabled??true,themes:fd.getAll('themes')});
      if(!await update(s=>{const i=s.routines.findIndex(x=>x.id===r.id);if(i<0)s.routines.push(r);else s.routines[i]=r;}))return;
    } else {
      const a=validateCheckin({key:`${form.dataset.date}:${form.dataset.routine}`,routineId:form.dataset.routine,date:form.dataset.date,title:form.dataset.title,answer:fd.get('answer'),bedtime:fd.get('bedtime'),before:form.dataset.before});
      saveRoutineAnswer(structuredClone(data()),a,fd.getAll('themes'));
      if(!await update(s=>saveRoutineAnswer(s,a,fd.getAll('themes'))))return;
    }
    dialog.close();render();toast(form.id==='checkin-form'&&fd.get('answer')!=='skip'?'잘했어요! 보미에 바로 기록했어요.':'저장했어요.');
  } catch(error){form.querySelector('.form-error').textContent=error.message;}
}
const notifiedRoutines=new Set();
function routineCheck() {
  if(demo||storageBlocked)return;
  if(page==='today'&&!dialog.open&&!saving){const panel=document.querySelector('#checkins');if(!panel?.contains(document.activeElement)){const html=checkinsPanel();if(panel){if(panel.outerHTML!==html)panel.outerHTML=html;}else if(html)document.querySelector('.daily-column')?.insertAdjacentHTML('afterbegin',html);}}
  if(!localMode)return;
  for(const r of routineDue(state)) {
    if(notifiedRoutines.has(r.key))continue;
    notifiedRoutines.add(r.key);
    // Persist delivery separately from answers; a notification never means completion.
    try {if(localStorage.getItem(`bomi.question.${r.key}`))continue;localStorage.setItem(`bomi.question.${r.key}`,'1');}catch{continue;}
    toast('보미가 물어볼 일이 있어요. 오늘 화면에서 답변해주세요.');
    if('Notification'in window&&Notification.permission==='granted')try{const n=new Notification('보미',{body:r.kind==='bedtime'?`${r.title}: 지난밤 몇 시에 누웠나요?`:`${r.title}, 완료했나요?`,tag:r.key});n.onclick=()=>{window.focus();checkinForm(r.id);n.close();};}catch{}
  }
}
setInterval(routineCheck,30000);


if(localMode){render();setInterval(reminderCheck,30000);}else{bootCloud();}


const codexApi=(action,value)=>codexRequest(action,value,localMode);
function bridgeHelp() {
  return localMode ? '' : `<p>이 컴퓨터의 Codex 앱과 보미 연결 프로그램을 실행해주세요. 휴대폰에서는 저장한 기록을 확인하고 직접 입력할 수 있어요.</p><p>보미 폴더의 터미널에서 실행:</p><pre class="bridge-command"><code>npm run bridge -- ${esc(location.origin)}</code></pre><p class="footnote">컴퓨터마다 한 번씩 연결해요. 브라우저가 로컬 연결 권한을 물으면 허용해주세요. 회사 정책에서 차단한 연결은 우회하지 마세요.</p>`;
}
async function codexSettings() {
  if(mobileDevice)return;
  showDialog(`${closeButton}<h2>이 컴퓨터의 Codex 연결을 확인하고 있어요.</h2><p>브라우저가 로컬 연결 권한을 요청하면 허용해주세요.</p>`);
  dialog.dataset.codex='settings';
  let reachable=false;try{await codexApi('status');reachable=true;}catch{}
  if(!dialog.open||dialog.dataset.codex!=='settings')return;
  showDialog(`${closeButton}<h2>이 컴퓨터에서 하루 작업 가져오기</h2><p>${reachable?'연결 프로그램이 실행 중이에요.':'연결 프로그램에 닿지 못했어요. 실행 상태와 브라우저의 로컬 연결 권한을 확인해주세요.'}</p><p>가져오기 버튼을 누르면 이 보미 폴더에서 새 Codex 정리 세션을 만들고 요청을 자동 전송해요. 이 컴퓨터에서 그날 처음 요청하면 00:00부터, 다음 요청은 마지막 요청 시각부터 이어서 확인해요. 브라우저를 바꿔도 같은 컴퓨터의 조회 시각을 사용해요.</p><p>특정 채팅을 지정할 필요는 없어요. 회사·범위가 불명확한 작업은 제외하며 결과는 확인 후에만 기록해요.</p>${bridgeHelp()}`);
}
let codexWatch=false;
try{codexWatch=localStorage.getItem('bomi.codex.watch')==='1';}catch{}
function dismissCodexNotice() {
  codexWatch=false;
  try{localStorage.setItem('bomi.codex.watch','0');}catch{}
  const notice=document.querySelector('#codex-notice');if(notice)notice.innerHTML='';
}
async function refreshCodexNotice() {
  if(mobileDevice||!codexWatch||demo||document.hidden||dialog.open)return;
  const notice=document.querySelector('#codex-notice');if(!notice)return;
  let message='';
  try {
    const {job}=await codexApi('status');
    if(job)message=`${esc(fmt(job.date))} · ${job.status==='ready'?`정리한 일 ${(job.groups?.reduce((n,g)=>n+g.items.length,0)??job.records?.length??0)}개가 도착했어요. 확인 후 서버에 저장해주세요.`:'Codex 정리 요청이 있어요.'} <button data-action="codex">${job.status==='ready'?'정리 결과 확인':'진행 상태 확인'}</button>`;
  } catch {message='Codex 결과를 확인하려면 이 컴퓨터의 연결 프로그램을 켜주세요. <button data-action="codex">다시 연결</button>';}
  if(!codexWatch||demo||dialog.open)return;
  notice.innerHTML=message?`<div class="banner codex-banner"><div role="status">${message}</div><button type="button" class="banner-close" data-action="codex-notice-dismiss" aria-label="Codex 연결 안내 닫기">${closeIcon}</button></div>`:'';
}
setInterval(refreshCodexNotice,10000);
window.addEventListener('focus',refreshCodexNotice);
async function collectCodex() {
  if(mobileDevice)return;
  codexWatch=true;try{localStorage.setItem('bomi.codex.watch','1');}catch{}
  if(demo){toast('예시 모드를 마친 뒤 개인 작업을 가져올 수 있어요.');return;}
  if(storageBlocked){toast('설정에서 기존 기록을 먼저 복구해주세요.');return;}
  const date=selected;
  showDialog(`${closeButton}<h2>Codex에 연결하고 있어요</h2><p class="quiet" role="status">이 컴퓨터의 개인 프로젝트에서 ${fmt(date)}에 한 일을 가져와요.</p>`);
  dialog.dataset.codex='pending';
  try {
    let result=await codexApi('status');
    if(!dialog.open||dialog.dataset.codex!=='pending')return;
    if(!result.job)result=await codexApi('collect',{date});
    if(dialog.open&&dialog.dataset.codex==='pending')showCodexStatus(result);
  } catch {if(dialog.open&&dialog.dataset.codex==='pending')showDialog(`${closeButton}<h2>연결 상태를 확인해주세요</h2><p>Codex 앱과 보미 연결 프로그램, 브라우저의 로컬 연결 권한을 확인해주세요. 전달 여부가 불명확하면 다시 요청하지 않아요.</p>${bridgeHelp()}<button class="secondary" data-action="codex-settings">이 컴퓨터의 Codex 연결 설정</button><button class="primary full" data-action="codex">상태 다시 확인</button>`);}
}
function showCodexStatus(result) {
  const job=result.job;
  if(!job){dialog.close();return;}
  if(job.status==='ready'){reviewCodex(job);return;}
  showDialog(`${closeButton}<h2>${job.status==='awaiting-send'?'새 Codex 채팅에서 전송을 눌러주세요':job.status==='queued'?'Codex가 정리하고 있어요':'Codex 정리 상태를 확인해주세요'}</h2><p class="quiet" role="status">${esc(job.message||(job.status==='queued'?'새 정리 세션에 요청을 자동으로 보냈어요. 결과가 도착하면 보미에서 확인할 수 있어요.':'열린 Codex 채팅에서 요청 진행 상태를 확인해주세요.'))}</p><p class="footnote">${esc(fmt(job.date))} · 확인 전에는 기록과 꽃에 반영하지 않아요. 창을 닫아도 요청은 유지돼요.</p><div class="inline-actions">${job.threadId?`<a class="secondary" href="codex://threads/${esc(job.threadId)}">정리 채팅 열기</a>`:''}<button class="text-button" id="end-codex">이 요청 종료하기</button></div><p class="footnote">요청을 종료해도 Codex에서 진행 중인 작업은 중단되지 않아요.</p>`);
  dialog.dataset.codex='pending';
  document.querySelector('#end-codex').onclick=async()=>{try{await codexApi('close',{id:job.id});dialog.close();toast('보미에서 결과 기다리기를 종료했어요.');}catch{toast('연결 상태를 확인해주세요.');}};
  codexTimer=setTimeout(async()=>{if(!dialog.open||dialog.dataset.codex!=='pending')return;try{const state=await codexApi('status');if(dialog.open&&dialog.dataset.codex==='pending')showCodexStatus(state);}catch{if(dialog.open&&dialog.dataset.codex==='pending')showDialog(`${closeButton}<h2>연결이 잠시 끊겼어요</h2><p>요청은 보존돼요. 다시 연결하면 진행 상태를 확인할 수 있어요.</p><button class="primary full" data-action="codex">상태 다시 확인</button>`);}},3000);
}
function reviewCodex(job) {
  // Older pending requests remain reviewable without rewriting their source files.
  const groups=job.groups||groupRecords(job.records||[]).map(([title,items])=>({id:`import:${items[0].id}`,title,themes:[...new Set(items.flatMap(r=>r.themes))],items}));
  showDialog(`${closeButton}<h2>정리한 일을 확인해주세요</h2>${job.window?`<p class="quiet">조회 구간 · ${esc(new Date(job.window.from).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))} ~ ${esc(new Date(job.window.to).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))}</p>`:''}${job.note?`<p class="footnote">${esc(job.note)}</p>`:''}${job.coverageComplete===false?'<p class="error">일부 내역을 확인하지 못했어요. 다음 요청에서 같은 구간을 다시 확인해요.</p>':''}<p class="footnote">이미 기록한 일은 내용만 갱신하고 현재 묶음·날짜·테마를 유지해요. 묶음 변경은 기록 목록에서 할 수 있어요.</p><form id="codex-review">${groups.map((g,gi)=>`<section class="work-group"><label for="codex-group-${gi}">묶음 제목</label><input id="codex-group-${gi}" name="group-${gi}" maxlength="80" value="${esc(g.title)}"><fieldset class="theme-picker"><legend>묶음 테마</legend>${THEMES.map(t=>`<label style="--accent:${t.color}"><input type="radio" name="group-theme-${gi}" value="${t.id}" ${g.themes.length===1&&g.themes[0]===t.id?'checked':''}><span>${themeIcons[t.id]}${t.name}</span></label>`).join('')}</fieldset>${g.items.map((r,ri)=>{const key=`${gi}-${ri}`;return `<details class="codex-draft"><summary><span class="draft-heading"><strong>${esc(r.summary||r.text)}</strong></span><span class="draft-chevron" aria-hidden="true">⌄</span></summary><div class="draft-body"><label class="draft-include"><input type="checkbox" name="include" value="${key}" checked> 이 일 기록하기</label><label for="codex-summary-${key}">목록에 보일 한 줄 · 선택</label><input id="codex-summary-${key}" name="summary-${key}" maxlength="80" value="${esc(r.summary||'')}"><label for="codex-text-${key}">실제로 한 일 · 상세</label><textarea id="codex-text-${key}" name="text-${key}" maxlength="1000">${esc(r.text)}</textarea></div></details>`;}).join('')}</section>`).join('')}${groups.length?'':'<p class="empty">확인할 수 있는 완료 내역이 없어요.</p>'}<p class="form-error" role="alert"></p><div class="inline-actions">${groups.length?`<button class="primary">확인한 일 기록하기</button>`:''}<button type="button" id="discard-codex" class="secondary">이번 초안 닫기</button></div></form>`);
  document.querySelector('#discard-codex').onclick=async()=>{try{await codexApi('close',{id:job.id});dialog.close();}catch{toast('연결 상태를 확인해주세요.');}};
  document.querySelector('#codex-review').onsubmit=async event=>{
    event.preventDefault();const f=event.currentTarget,fd=new FormData(f);
    try {
      const entries=fd.getAll('include').map(key=>{
        const [gi,ri]=key.split('-').map(Number),g=groups[gi],draft=g.items[ri],themes=fd.getAll(`group-theme-${gi}`);
        if(!themes.length){f.querySelector(`[name="group-theme-${gi}"]`).focus();throw new Error(`묶음 테마를 선택해주세요: ${g.title||'해낸 일'}`);}
        return {groupId:g.id,record:validateRecord({...draft,date:job.date,summary:fd.get(`summary-${key}`),group:fd.get(`group-${gi}`),text:fd.get(`text-${key}`),result:draft.result||'',themes,saved:data().records.find(r=>r.id===draft.id)?.saved||false})};
      });
      if(!entries.length)throw new Error('실제로 한 일을 한 개 이상 선택해주세요.');
      if(cloud?.pending().length)throw new Error('이전에 저장하던 입력을 먼저 복구해주세요.');
      if(!await update(s=>{for(const {groupId,record} of entries){const old=s.records.find(r=>r.id===record.id);putRecord(s,record,old?.groupId||groupId);}}))return;
      let acknowledged=true;try{await codexApi('close',{id:job.id});}catch{acknowledged=false;}
      selected=job.date;month=selected.slice(0,7);page='today';filter='';render();
      showDialog(`${closeButton}<div class="celebration">${flower(activeThemes(data().records,selected),'pop')}<h2>해낸 일 ${entries.length}개를 기록했어요.</h2><p>확인한 묶음의 테마를 도장과 꽃에 반영했어요.</p>${acknowledged?'':'<p class="footnote">기록은 저장했지만 요청 종료 확인이 지연됐어요. 다시 확인해도 중복되지 않아요.</p>'}<button class="primary full" data-action="close">내 기록 보기</button></div>`);
    } catch(error){f.querySelector('.form-error').textContent=error.message;}
  };
}

function cloudSettings() {
  return `<div class="page-heading"><h1>기록과 알림을 설정해요.</h1></div><div class="settings-grid"><section class="card"><span class="pill">내 계정에 저장</span><h2>나의 기록 보관</h2>${mobileDevice?'':`<button class="text-button" data-action="codex-settings">이 컴퓨터의 Codex 연결 설정</button>`}<p>같은 계정에서 저장한 기록은 모든 기기에 자동으로 반영돼요.</p><div class="inline-actions"><button class="secondary" data-action="export">기록 백업하기 ↓</button><label class="secondary file-label">백업 가져오기<input type="file" id="import-file" accept="application/json,.json"></label><a class="secondary" href="/cdn-cgi/access/logout">로그아웃</a></div><p class="footnote">로컬 보미에서 백업한 파일을 가져올 수 있어요. 가져오기는 현재 기록을 교체하므로 먼저 양쪽을 백업해주세요.</p></section><section class="card"><h2>하루를 챙기는 알림</h2><p>알림을 받을 기기마다 아래 버튼으로 허용해주세요. 아이폰은 먼저 홈 화면에 보미를 추가해주세요.</p><form id="reminder-form"><label for="reminder-time">알림 받을 시각 · 한국시간</label><input type="time" id="reminder-time" name="time" value="${esc(data().reminder)}"><div class="inline-actions"><button class="primary">시각 저장</button><button type="button" data-action="reminder-off">하루 알림 끄기</button></div></form><div class="inline-actions"><button class="secondary" data-action="cloud-push">이 기기에서 알림 받기</button><button class="text-button" data-action="cloud-unsubscribe">이 기기 알림 해제</button></div></section></div>`;
}
function cloudBanner() {
  return cloud.pending().length ? '<div class="banner error" role="status">서버 저장이 끝나지 않은 입력이 이 기기에 남아 있어요. <button data-action="cloud-retry">저장 다시 시도</button><button data-action="cloud-recover">입력 백업 후 최신 기록 불러오기</button></div>' : '';
}
async function bootCloud() {
  app.innerHTML='<main class="card"><h1>내 기록을 불러오고 있어요.</h1></main>';
  try {
    cloudConfig=initialConfig || await api('/api/config');
    if(cloudConfig.mode!=='cloud')throw new Error('서버 연결을 확인해주세요.');
    cloud=new CloudStore(cloudConfig.owner);
    state=await cloud.load(); render();
  } catch {
    app.innerHTML='<main class="card"><h1>로그인과 연결을 확인해주세요.</h1><p>본인 계정으로 로그인한 뒤 기록을 불러올 수 있어요.</p><a class="primary" href="/">다시 연결하기</a></main>';
  }
}
async function cloudAction(kind) {
  if(!cloud)return;
  if(demo){toast('예시 모드에서는 계정 설정을 바꾸지 않아요.');return;}
  try {
    if(kind==='cloud-push'){await enablePush(cloudConfig.pushPublicKey);toast('이 기기의 알림을 등록했어요. 알림 시각도 저장해주세요.');return;}
    if(kind==='cloud-unsubscribe'){await disablePush();toast('이 기기의 알림을 해제했어요.');return;}
    if(kind==='cloud-retry'){state=await cloud.retry();render();toast('저장을 확인했어요.');return;}
    if(kind==='cloud-recover'){
      const items=cloud.pending();
      if(items.length===1)download(JSON.stringify(items[0].input.state,null,2),`bomi-unsent-${today()}.json`);
      else download(JSON.stringify(items.map(item=>item.input),null,2),`bomi-unsent-bundle-${today()}.json`);
      const latest=await cloud.load();
      // Only the pending writes included in this user-requested backup are cleared.
      for(const item of items)cloud.storage.removeItem(item.key);
      state=latest;render();toast('입력을 백업하고 최신 기록을 불러왔어요. 필요한 내용을 다시 반영해주세요.');return;
    }
    if(kind==='cloud-refresh'){
      if(cloud.pending().length)throw new Error('보존된 입력을 먼저 백업하거나 다시 저장해주세요.');
      state=await cloud.load();render();toast('최신 기록을 불러왔어요.');
    }
  }catch(error){toast(error.message);}
}


let refreshingCloud=false;
function canRefreshCloud() {
  return cloud&&!demo&&!saving&&!cloud.busy&&!dialog.open&&!document.hidden&&!cloud.pending().length&&
    !document.querySelector('.arrange-list')&&
    !document.querySelector('form :focus')&&
    ![...document.querySelectorAll('form input,form textarea')].some(el=>el.type==='checkbox'||el.type==='radio'?el.checked!==el.defaultChecked:el.value!==el.defaultValue);
}
async function refreshCloudRecords() {
  if(refreshingCloud||!canRefreshCloud())return;
  refreshingCloud=true;
  const revision=cloud.revision;
  try {
    const latest=await api('/api/state');
    if(!canRefreshCloud()||cloud.revision!==revision)return;
    if(!Number.isSafeInteger(latest.revision)||latest.revision<=revision)return;
    const next=validateState(latest.state);
    cloud.revision=latest.revision;state=next;render();
  } catch { /* A later focus or interval retries without discarding local input. */ }
  finally {refreshingCloud=false;}
}
setInterval(refreshCloudRecords,10000);
window.addEventListener('focus',refreshCloudRecords);
document.addEventListener('visibilitychange',refreshCloudRecords);
dialog.addEventListener('close',refreshCloudRecords);
